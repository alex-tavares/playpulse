import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import { gameIdSchema } from '@playpulse/schemas';

import type { IngestPublicClientConfig } from '../config/ingest-config';
import { HttpError } from '../lib/http-error';
import { hashOpaqueValue, signSignaturePayload } from '../lib/hmac';

const tokenScope = 'ingest:events';
const tokenVersion = 1;

const platformChannelSchema = z.enum(['web_itch', 'windows', 'linux', 'macos']);

export const clientTokenRequestSchema = z.object({
  build_id: z.string().min(1).max(16),
  client_id: z.string().min(1),
  game_id: gameIdSchema,
  game_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  locale: z.string().max(8).optional(),
  platform: z.enum(['pc', 'mac', 'linux']).optional(),
  platform_channel: platformChannelSchema,
});

export interface ClientTokenIssueResult {
  client: IngestPublicClientConfig;
  expiresAt: Date;
  refreshAfterSeconds: number;
  token: string;
}

export interface VerifiedClientToken {
  client: IngestPublicClientConfig;
  clientId: string;
  expiresAtUnix: number;
  gameId: 'mythclash' | 'mythtag';
  jti: string;
}

interface ClientTokenPayload {
  build_id: string;
  client_id: string;
  exp: number;
  game_id: 'mythclash' | 'mythtag';
  iat: number;
  jti: string;
  platform_channel: 'web_itch' | 'windows' | 'linux' | 'macos';
  scope: typeof tokenScope;
  v: typeof tokenVersion;
}

export class ClientTokenService {
  constructor(
    private readonly publicClientsById: Map<string, IngestPublicClientConfig>,
    private readonly signingSecret: string,
    private readonly now: () => Date
  ) {}

  getPublicClient(clientId: string) {
    return this.publicClientsById.get(clientId);
  }

  issueToken(payload: unknown, origin: string | undefined): ClientTokenIssueResult {
    const parsed = clientTokenRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new HttpError(400, 'bad_request', 'Client token request is invalid');
    }

    const client = this.publicClientsById.get(parsed.data.client_id);
    if (!client?.enabled) {
      throw new HttpError(401, 'unauthorized', 'Client is not enabled');
    }

    this.assertClientRequestAllowed(client, {
      buildId: parsed.data.build_id,
      gameId: parsed.data.game_id,
      gameVersion: parsed.data.game_version,
      origin,
      platformChannel: parsed.data.platform_channel,
    });

    const issuedAt = Math.floor(this.now().getTime() / 1000);
    const expiresAt = issuedAt + client.tokenTtlSeconds;
    const tokenPayload: ClientTokenPayload = {
      build_id: parsed.data.build_id,
      client_id: client.clientId,
      exp: expiresAt,
      game_id: client.gameId,
      iat: issuedAt,
      jti: randomUUID(),
      platform_channel: client.platformChannel,
      scope: tokenScope,
      v: tokenVersion,
    };

    return {
      client,
      expiresAt: new Date(expiresAt * 1000),
      refreshAfterSeconds: Math.max(client.tokenTtlSeconds - 600, 60),
      token: this.signToken(tokenPayload),
    };
  }

  verifyAuthorizationHeader(
    authorizationHeader: string | string[] | undefined,
    origin: string | undefined
  ): VerifiedClientToken {
    const normalizedHeader = Array.isArray(authorizationHeader)
      ? authorizationHeader[0]
      : authorizationHeader;
    const token = normalizedHeader?.startsWith('Bearer ')
      ? normalizedHeader.slice('Bearer '.length).trim()
      : '';

    if (!token) {
      throw new HttpError(401, 'unauthorized', 'Authentication is missing or invalid');
    }

    const payload = this.verifyToken(token);
    const client = this.publicClientsById.get(payload.client_id);
    if (!client?.enabled) {
      throw new HttpError(401, 'token_invalid', 'Client token is invalid');
    }

    if (payload.exp <= Math.floor(this.now().getTime() / 1000)) {
      throw new HttpError(401, 'token_expired', 'Client token expired');
    }

    if (
      payload.v !== tokenVersion ||
      payload.scope !== tokenScope ||
      payload.game_id !== client.gameId ||
      payload.platform_channel !== client.platformChannel ||
      !client.allowedBuildIds.includes(payload.build_id)
    ) {
      throw new HttpError(401, 'token_invalid', 'Client token is invalid');
    }

    if (client.allowedOrigins.length > 0 && !isAllowedOrigin(origin, client.allowedOrigins)) {
      throw new HttpError(403, 'origin_not_allowed', 'Request origin is not allowed');
    }

    return {
      client,
      clientId: payload.client_id,
      expiresAtUnix: payload.exp,
      gameId: payload.game_id,
      jti: payload.jti,
    };
  }

  private assertClientRequestAllowed(
    client: IngestPublicClientConfig,
    request: {
      buildId: string;
      gameId: 'mythclash' | 'mythtag';
      gameVersion: string;
      origin: string | undefined;
      platformChannel: 'web_itch' | 'windows' | 'linux' | 'macos';
    }
  ) {
    if (
      request.gameId !== client.gameId ||
      request.platformChannel !== client.platformChannel ||
      !client.allowedBuildIds.includes(request.buildId) ||
      !client.allowedGameVersions.includes(request.gameVersion)
    ) {
      throw new HttpError(401, 'unauthorized', 'Client is not allowed for this build');
    }

    if (client.allowedOrigins.length > 0 && !isAllowedOrigin(request.origin, client.allowedOrigins)) {
      throw new HttpError(403, 'origin_not_allowed', 'Request origin is not allowed');
    }
  }

  private signToken(payload: ClientTokenPayload) {
    const encodedPayload = encodeBase64Url(JSON.stringify(payload));
    const signature = encodeBase64Url(signSignaturePayload(encodedPayload, this.signingSecret));
    return `${encodedPayload}.${signature}`;
  }

  private verifyToken(token: string): ClientTokenPayload {
    const [encodedPayload, encodedSignature, extra] = token.split('.');
    if (!encodedPayload || !encodedSignature || extra !== undefined) {
      throw new HttpError(401, 'token_invalid', 'Client token is invalid');
    }

    const expectedSignature = signSignaturePayload(encodedPayload, this.signingSecret);
    const receivedSignature = decodeBase64Url(encodedSignature);
    if (
      receivedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(receivedSignature, expectedSignature)
    ) {
      throw new HttpError(401, 'token_invalid', 'Client token is invalid');
    }

    try {
      const parsed = JSON.parse(decodeBase64Url(encodedPayload).toString('utf8')) as unknown;
      return tokenPayloadSchema.parse(parsed);
    } catch {
      throw new HttpError(401, 'token_invalid', 'Client token is invalid');
    }
  }
}

const tokenPayloadSchema: z.ZodType<ClientTokenPayload> = z.object({
  build_id: z.string().min(1).max(16),
  client_id: z.string().min(1),
  exp: z.number().int().positive(),
  game_id: gameIdSchema,
  iat: z.number().int().positive(),
  jti: z.string().uuid(),
  platform_channel: platformChannelSchema,
  scope: z.literal(tokenScope),
  v: z.literal(tokenVersion),
});

export const isAllowedOrigin = (origin: string | undefined, allowedOrigins: string[]) => {
  if (!origin) {
    return false;
  }

  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin.includes('*')) {
      const [prefix, suffix] = allowedOrigin.split('*', 2);
      return origin.startsWith(prefix ?? '') && origin.endsWith(suffix ?? '');
    }

    return origin === allowedOrigin;
  });
};

export const hashClientTokenIdentifier = (clientId: string) => hashOpaqueValue(clientId);

const encodeBase64Url = (value: string | Buffer) =>
  Buffer.from(value).toString('base64url');

const decodeBase64Url = (value: string) => Buffer.from(value, 'base64url');
