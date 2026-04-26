import type { RequestHandler } from 'express';

import { HttpError } from '../lib/http-error';
import type { IngestResponseLocals } from '../lib/request-context';
import { ConfiguredRateLimiter } from '../lib/configured-rate-limiter';
import {
  ClientTokenService,
  hashClientTokenIdentifier,
} from '../services/client-token-service';

interface ClientTokensControllerDependencies {
  clientTokenService: ClientTokenService;
  tokenRateLimiter: ConfiguredRateLimiter;
}

export const createClientTokensController = ({
  clientTokenService,
  tokenRateLimiter,
}: ClientTokensControllerDependencies): RequestHandler<
  never,
  unknown,
  unknown,
  unknown,
  IngestResponseLocals
> =>
  (request, response, next) => {
    try {
      const result = clientTokenService.issueToken(
        request.body,
        Array.isArray(request.headers.origin) ? request.headers.origin[0] : request.headers.origin
      );

      const decision = tokenRateLimiter.consume(result.client.clientId, result.client.tokenRateLimit);
      if (!decision.allowed) {
        response.locals.context.rateLimited = true;
        throw new HttpError(429, 'rate_limited_key', 'Client token rate limit exceeded', {
          headers: {
            'Retry-After': String(decision.retryAfterSec),
          },
        });
      }

      response.locals.context.apiKeyHash = hashClientTokenIdentifier(result.client.clientId);

      response.status(200).json({
        data: {
          expires_at: result.expiresAt.toISOString(),
          refresh_after_s: result.refreshAfterSeconds,
          token: result.token,
        },
        request_id: response.locals.context.requestId,
      });
    } catch (error) {
      response.locals.context.errorCode =
        error instanceof HttpError ? error.code : response.locals.context.errorCode;
      next(error);
    }
  };
