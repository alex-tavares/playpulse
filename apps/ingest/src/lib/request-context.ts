import { randomUUID } from 'node:crypto';

export interface RequestContext {
  apiKeyHash: string | null;
  errorCode: string | null;
  ipPrefix: string;
  payloadBytes: number;
  rateLimited: boolean;
  requestId: string;
  startedAtMs: number;
}

export interface IngestResponseLocals {
  context: RequestContext;
}

export const createRequestContext = (startedAtMs: number, ipPrefix: string): RequestContext => ({
  apiKeyHash: null,
  errorCode: null,
  ipPrefix,
  payloadBytes: 0,
  rateLimited: false,
  requestId: randomUUID(),
  startedAtMs,
});
