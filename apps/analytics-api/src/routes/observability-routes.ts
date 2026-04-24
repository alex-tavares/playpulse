import { Router } from 'express';

import type { AnalyticsMetrics } from '../lib/observability-metrics';

export const createObservabilityRouter = (metrics: AnalyticsMetrics) => {
  const router = Router();

  router.get('/metrics', (_request, response) => {
    response.type('text/plain; version=0.0.4').status(200).send(metrics.render());
  });

  return router;
};
