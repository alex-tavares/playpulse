import type { RequestHandler } from 'express';

import type { IngestResponseLocals } from '../lib/request-context';

export const createHealthController = (now: () => Date): RequestHandler<never, unknown, unknown, unknown, IngestResponseLocals> =>
  (_request, response) => {
    response.status(200).json({
      data: {
        service: 'ingest',
        status: 'ok',
        time: now().toISOString(),
      },
      request_id: response.locals.context.requestId,
    });
  };
