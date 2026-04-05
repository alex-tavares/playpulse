import express, { Router, type RequestHandler } from 'express';

import { createEventsController } from '../controllers/events-controller';
import { HttpError } from '../lib/http-error';
import { EventIngestService } from '../services/event-ingest-service';
import { IngestAuthService } from '../services/ingest-auth-service';
import { DualWindowRateLimiter } from '../lib/rate-limiter';
import type { IngestResponseLocals } from '../lib/request-context';

interface EventsRouterDependencies {
  authService: IngestAuthService;
  eventIngestService: EventIngestService;
  ipRateLimiter: DualWindowRateLimiter;
  keyRateLimiter: DualWindowRateLimiter;
}

const requireJsonContentType: RequestHandler<never, unknown, unknown, unknown, IngestResponseLocals> = (
  request,
  _response,
  next
) => {
  const contentType = request.headers['content-type'];
  const normalizedContentType = Array.isArray(contentType) ? contentType[0] : contentType;

  if (!normalizedContentType?.startsWith('application/json')) {
    next(new HttpError(400, 'bad_request', 'Content-Type must be application/json'));
    return;
  }

  next();
};

export const createEventsRouter = ({
  authService,
  eventIngestService,
  ipRateLimiter,
  keyRateLimiter,
}: EventsRouterDependencies) => {
  const router = Router();
  const controller = createEventsController({
    authService,
    eventIngestService,
    keyRateLimiter,
  });

  const enforceIpRateLimit: RequestHandler<
    never,
    unknown,
    unknown,
    unknown,
    IngestResponseLocals
  > = (_request, response, next) => {
    const decision = ipRateLimiter.consume(response.locals.context.ipPrefix);

    if (!decision.allowed) {
      response.locals.context.rateLimited = true;
      next(
        new HttpError(429, 'rate_limited_ip', 'IP rate limit exceeded', {
          headers: {
            'Retry-After': String(decision.retryAfterSec),
          },
        })
      );
      return;
    }

    next();
  };

  router.options('/events', (_request, response) => {
    response.status(204).end();
  });

  router.post(
    '/events',
    enforceIpRateLimit,
    requireJsonContentType,
    express.raw({ limit: '1mb', type: 'application/json' }),
    controller
  );

  return router;
};
