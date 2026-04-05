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

export const createRequestContext = (startedAtMs: number, ipPrefix: string): RequestContext => ({
  errorCode: null,
  ipPrefix,
  payloadBytes: 0,
  requestId: randomUUID(),
  startedAtMs,
});
