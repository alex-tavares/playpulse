import type { RequestHandler } from 'express';

import { HttpError } from '../lib/http-error';
import type { IngestResponseLocals } from '../lib/request-context';
import { DualWindowRateLimiter } from '../lib/rate-limiter';
import { countCustomEventCandidates, EventIngestService } from '../services/event-ingest-service';
import { IngestAuthService } from '../services/ingest-auth-service';

interface EventsControllerDependencies {
  authService: IngestAuthService;
  eventIngestService: EventIngestService;
  keyRateLimiter: DualWindowRateLimiter;
}

export const createEventsController = ({
  authService,
  eventIngestService,
  keyRateLimiter,
}: EventsControllerDependencies): RequestHandler<never, unknown, Buffer, unknown, IngestResponseLocals> =>
  async (request, response, next) => {
    try {
      const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.alloc(0);
      response.locals.context.payloadBytes = rawBody.byteLength;

      const authenticatedRequest = authService.authenticate(request.headers, rawBody);
      response.locals.context.apiKeyHash = authenticatedRequest.apiKeyHash;

      const keyDecision = keyRateLimiter.consume(authenticatedRequest.apiKey.keyId);
      if (!keyDecision.allowed) {
        response.locals.context.rateLimited = true;
        throw new HttpError(429, 'rate_limited_key', 'API key rate limit exceeded', {
          headers: {
            'Retry-After': String(keyDecision.retryAfterSec),
          },
        });
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(rawBody.toString('utf8')) as unknown;
      } catch {
        throw new HttpError(400, 'bad_request', 'Request body is not valid JSON');
      }

      response.locals.context.customEventCandidates = countCustomEventCandidates(parsedJson);
      const result = await eventIngestService.ingest(parsedJson, authenticatedRequest.apiKey.keyId);
      response.locals.context.eventsWritten = result.acceptedCount;
      response.locals.context.customEventsAccepted = result.customEventCount;

      response.status(202).json({
        data: {
          accepted_count: result.acceptedCount,
          received_at: result.receivedAt.toISOString(),
        },
        request_id: response.locals.context.requestId,
      });
    } catch (error) {
      response.locals.context.errorCode =
        error instanceof HttpError ? error.code : response.locals.context.errorCode;

      next(error);
    }
  };
