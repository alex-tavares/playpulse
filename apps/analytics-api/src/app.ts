import type { PrismaClient } from '@prisma/client';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Logger } from 'pino';

import type { AnalyticsConfig } from './config/analytics-config';
import { createHealthRouter } from './routes/health-routes';
import { createMetricsRouter } from './routes/metrics-routes';
import { AnalyticsReadRepo } from './repos/analytics-read-repo';
import { AnalyticsMetricsService } from './services/analytics-metrics-service';
import { notFoundHandler, sendHttpError, toHttpError } from './lib/http-error';
import { sanitizeUserAgent, truncateIpAddress } from './lib/ip';
import { createRequestContext, type AnalyticsResponseLocals } from './lib/request-context';

interface AnalyticsAppDependencies {
  config: AnalyticsConfig;
  logger: Logger;
  now?: () => Date;
  prisma: PrismaClient;
}

const setCorsHeaders = (response: Response, allowedOrigins: string[], requestOrigin?: string) => {
  if (!requestOrigin) {
    return;
  }

  if (allowedOrigins.includes(requestOrigin)) {
    response.setHeader('Access-Control-Allow-Origin', requestOrigin);
  }

  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
};

export const createAnalyticsApp = ({
  config,
  logger,
  now = () => new Date(),
  prisma,
}: AnalyticsAppDependencies) => {
  const app = express();
  const analyticsReadRepo = new AnalyticsReadRepo(prisma);
  const analyticsMetricsService = new AnalyticsMetricsService(analyticsReadRepo, now);

  app.disable('x-powered-by');
  app.set('trust proxy', config.analyticsTrustProxy);

  app.use((request, response: Response<unknown, AnalyticsResponseLocals>, next) => {
    const startedAt = now();
    const forwardedIp =
      typeof request.headers['x-forwarded-for'] === 'string'
        ? request.headers['x-forwarded-for'].split(',')[0]?.trim()
        : undefined;
    const remoteIp = request.ip || forwardedIp || request.socket.remoteAddress || undefined;

    response.locals.context = createRequestContext(startedAt.getTime(), truncateIpAddress(remoteIp));

    response.on('finish', () => {
      const requestContext = response.locals.context;
      logger.info({
        error_code: requestContext?.errorCode,
        ip_prefix: requestContext?.ipPrefix ?? 'unknown',
        latency_ms: Date.now() - startedAt.getTime(),
        method: request.method,
        payload_bytes: requestContext?.payloadBytes ?? 0,
        request_id: requestContext?.requestId ?? 'unknown',
        route: request.route?.path ?? request.path,
        service: 'analytics',
        status_code: response.statusCode,
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
      config.analyticsAllowedOrigins,
      Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin
    );
    next();
  });

  app.use(createHealthRouter(now));
  app.use(
    createMetricsRouter({
      analyticsConfig: config,
      analyticsMetricsService,
    })
  );

  app.use(notFoundHandler);
  app.use(
    (
      error: unknown,
      _request: Request,
      response: Response<unknown, AnalyticsResponseLocals>,
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
