import { randomUUID } from 'node:crypto';

export interface RequestContext {
  errorCode: string | null;
  ipPrefix: string;
  payloadBytes: number;
  requestId: string;
  startedAtMs: number;
}

export interface AnalyticsResponseLocals {
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
  errorCode: null,
  ipPrefix,
  payloadBytes: 0,
  requestId: sanitizeRequestId(requestId),
  startedAtMs,
});
