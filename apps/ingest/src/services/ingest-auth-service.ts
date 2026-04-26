import { z } from 'zod';

import type { IngestApiKeyConfig, IngestPublicClientConfig } from '../config/ingest-config';
import { HttpError } from '../lib/http-error';
import { buildSignaturePayload, hashOpaqueValue, verifySignature } from '../lib/hmac';
import { ReplayCache } from '../lib/replay-cache';
import { ClientTokenService, hashClientTokenIdentifier } from './client-token-service';

const nonceSchema = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export interface AuthenticatedRequest {
  authMode: 'hmac' | 'bearer_token';
  apiKeyHash: string;
  gameId: 'mythclash' | 'mythtag';
  keyId: string;
  nonce: string;
  publicClient?: IngestPublicClientConfig;
  timestamp: string;
}

export class IngestAuthService {
  constructor(
    private readonly apiKeysById: Map<string, IngestApiKeyConfig>,
    private readonly authModes: Array<'hmac' | 'bearer_token'>,
    private readonly clientTokenService: ClientTokenService,
    private readonly replayCache: ReplayCache,
    private readonly now: () => Date,
    private readonly replayWindowSeconds: number
  ) {}

  authenticate(headers: Record<string, string | string[] | undefined>, rawBody: Buffer) {
    const authorization = this.readOptionalHeader(headers, 'authorization');
    if (authorization?.startsWith('Bearer ')) {
      return this.authenticateBearer(headers);
    }

    return this.authenticateHmac(headers, rawBody);
  }

  private authenticateHmac(
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer
  ) {
    if (!this.authModes.includes('hmac')) {
      throw new HttpError(401, 'unauthorized', 'Authentication is missing or invalid');
    }

    const apiKeyId = this.readHeader(headers, 'x-api-key');
    const signature = this.readHeader(headers, 'x-signature');
    const timestamp = this.readHeader(headers, 'x-request-timestamp');
    const nonce = this.readHeader(headers, 'x-nonce');

    const apiKey = this.apiKeysById.get(apiKeyId);
    if (!apiKey || !apiKey.enabled) {
      throw new HttpError(401, 'unauthorized', 'Authentication is missing or invalid');
    }

    this.assertReplayHeaders(timestamp, nonce);

    const signaturePayload = buildSignaturePayload(timestamp, nonce, rawBody);
    if (!verifySignature(signaturePayload, apiKey.signingSecret, signature)) {
      throw new HttpError(401, 'signature_invalid', 'HMAC validation failed');
    }

    if (this.replayCache.register(apiKey.keyId, nonce).isReplay) {
      throw new HttpError(409, 'replay_detected', 'Nonce replay detected');
    }

    return {
      authMode: 'hmac',
      apiKeyHash: hashOpaqueValue(apiKey.keyId),
      gameId: apiKey.gameId,
      keyId: apiKey.keyId,
      nonce,
      timestamp,
    } satisfies AuthenticatedRequest;
  }

  private authenticateBearer(headers: Record<string, string | string[] | undefined>) {
    if (!this.authModes.includes('bearer_token')) {
      throw new HttpError(401, 'unauthorized', 'Authentication is missing or invalid');
    }

    const verifiedToken = this.clientTokenService.verifyAuthorizationHeader(
      headers.authorization,
      this.readOptionalHeader(headers, 'origin')
    );

    const timestamp = this.readHeader(headers, 'x-request-timestamp');
    const nonce = this.readHeader(headers, 'x-nonce');
    this.assertReplayHeaders(timestamp, nonce);

    if (this.replayCache.register(`token:${verifiedToken.jti}`, nonce).isReplay) {
      throw new HttpError(409, 'replay_detected', 'Nonce replay detected');
    }

    return {
      authMode: 'bearer_token',
      apiKeyHash: hashClientTokenIdentifier(verifiedToken.clientId),
      gameId: verifiedToken.gameId,
      keyId: verifiedToken.clientId,
      nonce,
      publicClient: verifiedToken.client,
      timestamp,
    } satisfies AuthenticatedRequest;
  }

  private assertReplayHeaders(timestamp: string, nonce: string) {
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
  }

  private readHeader(headers: Record<string, string | string[] | undefined>, headerName: string) {
    const value = this.readOptionalHeader(headers, headerName);

    if (!value) {
      throw new HttpError(401, 'unauthorized', 'Authentication is missing or invalid');
    }

    return value;
  }

  private readOptionalHeader(
    headers: Record<string, string | string[] | undefined>,
    headerName: string
  ) {
    const rawValue = headers[headerName];
    return Array.isArray(rawValue) ? rawValue[0] : rawValue;
  }
}
