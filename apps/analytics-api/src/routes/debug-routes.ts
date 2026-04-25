import { Router } from 'express';

import type { AnalyticsConfig } from '../config/analytics-config';
import {
  createCustomEventCountsController,
  createCustomEventNamesController,
  createCustomEventRecentController,
} from '../controllers/custom-events-debug-controller';
import { CustomEventsDebugService } from '../services/custom-events-debug-service';

interface DebugRouterDependencies {
  analyticsConfig: Pick<AnalyticsConfig, 'analyticsPrivateBearerToken'>;
  customEventsDebugService: CustomEventsDebugService;
}

export const createDebugRouter = ({
  analyticsConfig,
  customEventsDebugService,
}: DebugRouterDependencies) => {
  const router = Router();

  router.get(
    '/debug/custom-events/names',
    createCustomEventNamesController({
      analyticsConfig,
      customEventsDebugService,
    })
  );
  router.get(
    '/debug/custom-events/counts',
    createCustomEventCountsController({
      analyticsConfig,
      customEventsDebugService,
    })
  );
  router.get(
    '/debug/custom-events/recent',
    createCustomEventRecentController({
      analyticsConfig,
      customEventsDebugService,
    })
  );

  return router;
};
