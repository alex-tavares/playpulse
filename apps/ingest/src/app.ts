import type { PrismaClient } from '@prisma/client';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Logger } from 'pino';

import { createEventsRouter } from './routes/events-routes';
import { createHealthRouter } from './routes/health-routes';
import { createMetricsRouter } from './routes/metrics-routes';
import type { IngestConfig } from './config/ingest-config';
import { EventsRawRepo } from './repos/events-raw-repo';
import { EventIngestService } from './services/event-ingest-service';
import { IngestAuthService } from './services/ingest-auth-service';
import { notFoundHandler, sendHttpError, toHttpError } from './lib/http-error';
import { truncateIpAddress, sanitizeUserAgent } from './lib/ip';
import { createRequestContext, type IngestResponseLocals } from './lib/request-context';
import { createIngestMetrics, type IngestMetrics } from './lib/observability-metrics';
import { DualWindowRateLimiter } from './lib/rate-limiter';
import { ReplayCache } from './lib/replay-cache';

interface IngestAppDependencies {
  config: IngestConfig;
  logger: Logger;
  now?: () => Date;
  prisma: PrismaClient;
  ipRateLimiter?: DualWindowRateLimiter;
  keyRateLimiter?: DualWindowRateLimiter;
  metrics?: IngestMetrics;
  replayCache?: ReplayCache;
}

const setCorsHeaders = (response: Response, allowedOrigins: string[], requestOrigin?: string) => {
  if (!requestOrigin) {
    return;
  }

  if (allowedOrigins.includes(requestOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }

  response.setHeader('Vary', 'Origin');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Api-Key, X-Signature, X-Request-Timestamp, X-Nonce'
  );
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
};

export const createIngestApp = ({
  config,
  logger,
  now = () => new Date(),
  prisma,
  ipRateLimiter = new DualWindowRateLimiter(
    config.PLAYPULSE_RATE_LIMIT_PER_IP,
    config.PLAYPULSE_RATE_LIMIT_PER_IP_BURST
  ),
  keyRateLimiter = new DualWindowRateLimiter(
    config.PLAYPULSE_RATE_LIMIT_PER_KEY,
    config.PLAYPULSE_RATE_LIMIT_PER_KEY_BURST
  ),
  metrics = createIngestMetrics(),
  replayCache = new ReplayCache(config.PLAYPULSE_REPLAY_WINDOW_SECONDS * 1000),
}: IngestAppDependencies) => {
  const app = express();
  const authService = new IngestAuthService(
    config.apiKeysById,
    replayCache,
    now,
    config.PLAYPULSE_REPLAY_WINDOW_SECONDS
  );
  const eventsRawRepo = new EventsRawRepo(prisma);
  const eventIngestService = new EventIngestService(eventsRawRepo, now);

  app.disable('x-powered-by');
  app.set('trust proxy', config.ingestTrustProxy);

  app.use((request, response: Response<unknown, IngestResponseLocals>, next) => {
    const startedAt = now();
    const forwardedIp =
      typeof request.headers['x-forwarded-for'] === 'string'
        ? request.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined;
    const remoteIp = request.ip || forwardedIp || request.socket.remoteAddress || undefined;

    response.locals.context = createRequestContext(
      startedAt.getTime(),
      truncateIpAddress(remoteIp),
      request.headers['x-request-id']
    );
    response.setHeader('X-Request-Id', response.locals.context.requestId);

    response.on('finish', () => {
      const requestContext = response.locals.context;
      const requestId = requestContext?.requestId ?? 'unknown';
      const route = request.route?.path ?? request.path;
      const latencyMs = now().getTime() - startedAt.getTime();
      const contentLengthHeader = request.headers['content-length'];
      const rawContentLength = Array.isArray(contentLengthHeader)
        ? contentLengthHeader[0]
        : contentLengthHeader;
      const payloadBytes =
        requestContext?.payloadBytes ?? (Number.parseInt(rawContentLength ?? '0', 10) || 0);

      metrics.recordRequest({
        durationMs: latencyMs,
        errorCode: requestContext?.errorCode ?? null,
        route,
        statusCode: response.statusCode,
      });

      if (requestContext?.eventsWritten) {
        metrics.recordEventsWritten(requestContext.eventsWritten);
      }

      logger.info({
        api_key_hash: requestContext?.apiKeyHash,
        error_code: requestContext?.errorCode,
        ip_prefix: requestContext?.ipPrefix ?? 'unknown',
        latency_ms: latencyMs,
        method: request.method,
        payload_bytes: payloadBytes,
        rate_limited: requestContext?.rateLimited ?? false,
        request_id: requestId,
        route,
        service: 'ingest',
        status_code: response.statusCode,
        trace_id: requestId,
        ts: new Date().toISOString(),
        user_agent: sanitizeUserAgent(
          Array.isArray(request.headers['user-agent'])
            ? request.headers['user-agent'][0]
            : request.headers['user-agent']
        ),
      });
    });

    next();
  });

  app.use((request, response, next) => {
    setCorsHeaders(
      response,
      config.ingestAllowedOrigins,
      Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin
    );
    next();
  });

  app.use(createHealthRouter(now));
  app.use(createMetricsRouter(metrics));
  app.use(
    createEventsRouter({
      authService,
      eventIngestService,
      ipRateLimiter,
      keyRateLimiter,
    })
  );

  app.use(notFoundHandler);

  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response<unknown, IngestResponseLocals>,
      _next: NextFunction
    ) => {
      void _next;
      const httpError = toHttpError(error);
      response.locals.context.errorCode = httpError.code;
      sendHttpError(response, response.locals.context.requestId, httpError);
    }
  );

  return app;
};
