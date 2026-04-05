import { Router } from 'express';

import { createHealthController } from '../controllers/health-controller';

export const createHealthRouter = (now: () => Date) => {
  const router = Router();

  router.get('/health', createHealthController(now));

  return router;
};
