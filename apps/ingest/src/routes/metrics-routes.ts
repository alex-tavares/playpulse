import { Router } from 'express';

import type { IngestMetrics } from '../lib/observability-metrics';

export const createMetricsRouter = (metrics: IngestMetrics) => {
  const router = Router();

  router.get('/metrics', (_request, response) => {
    response.type('text/plain; version=0.0.4').status(200).send(metrics.render());
  });

  return router;
};
