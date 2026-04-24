import { randomUUID } from 'node:crypto';

export interface RequestContext {
  apiKeyHash: string | null;
  errorCode: string | null;
  eventsWritten: number;
  ipPrefix: string;
  payloadBytes: number;
  rateLimited: boolean;
  requestId: string;
  startedAtMs: number;
}

export interface IngestResponseLocals {
  context: RequestContext;
}

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export const sanitizeRequestId = (requestId: string | string[] | undefined) => {
  const rawRequestId = Array.isArray(requestId) ? requestId[0] : requestId;

  if (rawRequestId && requestIdPattern.test(rawRequestId)) {
    return rawRequestId;
  }

  return randomUUID();
};

export const createRequestContext = (
  startedAtMs: number,
  ipPrefix: string,
  requestId?: string | string[]
): RequestContext => ({
  apiKeyHash: null,
  errorCode: null,
  eventsWritten: 0,
  ipPrefix,
  payloadBytes: 0,
  rateLimited: false,
  requestId: sanitizeRequestId(requestId),
  startedAtMs,
});
