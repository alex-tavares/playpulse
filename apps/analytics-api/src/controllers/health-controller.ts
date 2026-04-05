import type { RequestHandler } from 'express';

import type { AnalyticsResponseLocals } from '../lib/request-context';

export const createHealthController = (
  now: () => Date
): RequestHandler<never, unknown, unknown, unknown, AnalyticsResponseLocals> => (_request, response) => {
  response.status(200).json({
    data: {
      service: 'analytics',
      status: 'ok',
      time: now().toISOString(),
    },
    request_id: response.locals.context.requestId,
  });
};
