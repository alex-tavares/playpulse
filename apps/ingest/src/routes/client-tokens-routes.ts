import express, { Router } from 'express';

import { createClientTokensController } from '../controllers/client-tokens-controller';
import { ConfiguredRateLimiter } from '../lib/configured-rate-limiter';
import { ClientTokenService } from '../services/client-token-service';

interface ClientTokensRouterDependencies {
  clientTokenService: ClientTokenService;
  tokenRateLimiter: ConfiguredRateLimiter;
}

export const createClientTokensRouter = ({
  clientTokenService,
  tokenRateLimiter,
}: ClientTokensRouterDependencies) => {
  const router = Router();
  const controller = createClientTokensController({
    clientTokenService,
    tokenRateLimiter,
  });

  router.options('/client-tokens', (_request, response) => {
    response.status(204).end();
  });

  router.post('/client-tokens', express.json({ limit: '16kb' }), controller);

  return router;
};
