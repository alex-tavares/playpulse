import { z } from 'zod';

import { HttpError } from '../lib/http-error';
import { buildSignaturePayload, hashOpaqueValue, verifySignature } from '../lib/hmac';
import { ReplayCache } from '../lib/replay-cache';
import type { IngestApiKeyConfig } from '../config/ingest-config';

const nonceSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export interface AuthenticatedRequest {
  apiKey: IngestApiKeyConfig;
  apiKeyHash: string;
  nonce: string;
  timestamp: string;
}

export class IngestAuthService {
  constructor(
    private readonly apiKeysById: Map<string, IngestApiKeyConfig>,
    private readonly replayCache: ReplayCache,
    private readonly now: () => Date,
    private readonly replayWindowSeconds: number
  ) {}

  authenticate(headers: Record<string, string | string[] | undefined>, rawBody: Buffer) {
    const apiKeyId = this.readHeader(headers, 'x-api-key');
    const signature = this.readHeader(headers, 'x-signature');
    const timestamp = this.readHeader(headers, 'x-request-timestamp');
    const nonce = this.readHeader(headers, 'x-nonce');

    const apiKey = this.apiKeysById.get(apiKeyId);
    if (!apiKey || !apiKey.enabled) {
      throw new HttpError(401, 'unauthorized', 'Authentication is missing or invalid');
    }

    if (!nonceSchema.safeParse(nonce).success) {
      throw new HttpError(400, 'bad_request', 'X-Nonce must be a UUID v4');
    }

    if (!/^\d+$/.test(timestamp)) {
      throw new HttpError(400, 'bad_request', 'X-Request-Timestamp must be a Unix epoch integer');
    }
    const timestampSeconds = Number.parseInt(timestamp, 10);

    const nowSeconds = Math.floor(this.now().getTime() / 1000);
    if (Math.abs(nowSeconds - timestampSeconds) > this.replayWindowSeconds) {
      throw new HttpError(
        401,
        'timestamp_out_of_window',
        'X-Request-Timestamp is outside the accepted replay window'
      );
    }

    const signaturePayload = buildSignaturePayload(timestamp, nonce, rawBody);
    if (!verifySignature(signaturePayload, apiKey.signingSecret, signature)) {
      throw new HttpError(401, 'signature_invalid', 'HMAC validation failed');
    }

    if (this.replayCache.register(apiKey.keyId, nonce).isReplay) {
      throw new HttpError(409, 'replay_detected', 'Nonce replay detected');
    }

    return {
      apiKey,
      apiKeyHash: hashOpaqueValue(apiKey.keyId),
      nonce,
      timestamp,
    } satisfies AuthenticatedRequest;
  }

  private readHeader(headers: Record<string, string | string[] | undefined>, headerName: string) {
    const rawValue = headers[headerName];
    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

    if (!value) {
      throw new HttpError(401, 'unauthorized', 'Authentication is missing or invalid');
    }

    return value;
  }
}
