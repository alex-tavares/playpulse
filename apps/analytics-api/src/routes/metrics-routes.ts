import { Router } from 'express';

import type { AnalyticsConfig } from '../config/analytics-config';
import {
  createCharacterPopularityController,
  createRetentionCohortsController,
  createSessionsDailyController,
  createSummaryController,
} from '../controllers/metrics-controller';
import { AnalyticsMetricsService } from '../services/analytics-metrics-service';

interface MetricsRouterDependencies {
  analyticsConfig: Pick<AnalyticsConfig, 'analyticsPrivateBearerToken'>;
  analyticsMetricsService: AnalyticsMetricsService;
}

export const createMetricsRouter = ({
  analyticsConfig,
  analyticsMetricsService,
}: MetricsRouterDependencies) => {
  const router = Router();

  router.get(
    '/metrics/summary',
    createSummaryController({
      analyticsConfig,
      analyticsMetricsService,
    })
  );
  router.get(
    '/metrics/sessions/daily',
    createSessionsDailyController({
      analyticsConfig,
      analyticsMetricsService,
    })
  );
  router.get(
    '/metrics/characters/popularity',
    createCharacterPopularityController({
      analyticsConfig,
      analyticsMetricsService,
    })
  );
  router.get(
    '/metrics/retention/cohorts',
    createRetentionCohortsController({
      analyticsConfig,
      analyticsMetricsService,
    })
  );

  return router;
};
