import { gameIdSchema } from '@playpulse/schemas';
import { readPlayPulseConfig, type PlayPulseConfig } from '@playpulse/config';
import { z } from 'zod';

export const defaultIngestEnv = {
  PLAYPULSE_INGEST_ALLOWED_ORIGINS: 'http://localhost:3000',
  PLAYPULSE_INGEST_API_KEYS_JSON: '[]',
  PLAYPULSE_INGEST_AUTH_MODES: 'hmac',
  PLAYPULSE_INGEST_HOST: '0.0.0.0',
  PLAYPULSE_INGEST_PORT: 4001,
  PLAYPULSE_INGEST_PUBLIC_CLIENTS_JSON: '[]',
  PLAYPULSE_INGEST_TOKEN_SIGNING_SECRET: '',
  PLAYPULSE_INGEST_TRUST_PROXY: false,
} as const;

const ingestApiKeySchema = z.object({
  enabled: z.boolean(),
  game_id: gameIdSchema,
  key_id: z.string().min(1),
  signing_secret: z.string().min(1),
});

const publicClientRateLimitSchema = z.object({
  burst: z.number().int().positive(),
  per_minute: z.number().int().positive(),
});

const publicClientSchema = z.object({
  allowed_build_ids: z.array(z.string().min(1)).min(1),
  allowed_game_versions: z.array(z.string().min(1)).min(1),
  allowed_origins: z.array(z.string().min(1)).default([]),
  client_id: z.string().min(1),
  enabled: z.boolean(),
  event_rate_limit: publicClientRateLimitSchema.optional(),
  game_id: gameIdSchema,
  platform_channel: z.enum(['web_itch', 'windows', 'linux', 'macos']),
  token_rate_limit: publicClientRateLimitSchema.optional(),
  token_ttl_seconds: z.number().int().positive().max(86_400).default(3_600),
});

const ingestAuthModeSchema = z.enum(['hmac', 'bearer_token']);

const parseBoolean = (value: string | boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const parseApiKeys = (rawValue: string) => {
  const parsedValue = JSON.parse(rawValue) as unknown;
  return z.array(ingestApiKeySchema).parse(parsedValue);
};

const parseAuthModes = (rawValue: string) =>
  rawValue
    .split(',')
    .map((mode) => mode.trim())
    .filter((mode) => mode.length > 0)
    .map((mode) => ingestAuthModeSchema.parse(mode));

const parsePublicClients = (rawValue: string) => {
  const parsedValue = JSON.parse(rawValue) as unknown;
  return z.array(publicClientSchema).parse(parsedValue);
};

export interface IngestApiKeyConfig {
  enabled: boolean;
  gameId: 'mythclash' | 'mythtag';
  keyId: string;
  signingSecret: string;
}

export interface PublicClientRateLimitConfig {
  burst: number;
  perMinute: number;
}

export interface IngestPublicClientConfig {
  allowedBuildIds: string[];
  allowedGameVersions: string[];
  allowedOrigins: string[];
  clientId: string;
  enabled: boolean;
  eventRateLimit: PublicClientRateLimitConfig;
  gameId: 'mythclash' | 'mythtag';
  platformChannel: 'web_itch' | 'windows' | 'linux' | 'macos';
  tokenRateLimit: PublicClientRateLimitConfig;
  tokenTtlSeconds: number;
}

export interface IngestConfig extends PlayPulseConfig {
  apiKeys: IngestApiKeyConfig[];
  apiKeysById: Map<string, IngestApiKeyConfig>;
  authModes: Array<'hmac' | 'bearer_token'>;
  ingestAllowedOrigins: string[];
  ingestHost: string;
  ingestPort: number;
  ingestTrustProxy: boolean;
  publicClients: IngestPublicClientConfig[];
  publicClientsById: Map<string, IngestPublicClientConfig>;
  tokenSigningSecret: string;
}

export const readIngestConfig = (
  env: Record<string, string | undefined> = process.env
): IngestConfig => {
  const sharedConfig = readPlayPulseConfig(env);
  const ingestPort = z.coerce
    .number()
    .int()
    .positive()
    .parse(env.PLAYPULSE_INGEST_PORT ?? defaultIngestEnv.PLAYPULSE_INGEST_PORT);
  const ingestHost = z
    .string()
    .min(1)
    .parse(env.PLAYPULSE_INGEST_HOST ?? defaultIngestEnv.PLAYPULSE_INGEST_HOST);
  const ingestAllowedOrigins = z
    .string()
    .parse(
      env.PLAYPULSE_INGEST_ALLOWED_ORIGINS ?? defaultIngestEnv.PLAYPULSE_INGEST_ALLOWED_ORIGINS
    )
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const ingestTrustProxy = parseBoolean(
    env.PLAYPULSE_INGEST_TRUST_PROXY ?? defaultIngestEnv.PLAYPULSE_INGEST_TRUST_PROXY
  );
  const parsedApiKeys = parseApiKeys(
    env.PLAYPULSE_INGEST_API_KEYS_JSON ?? defaultIngestEnv.PLAYPULSE_INGEST_API_KEYS_JSON
  );
  const authModes = parseAuthModes(
    env.PLAYPULSE_INGEST_AUTH_MODES ?? defaultIngestEnv.PLAYPULSE_INGEST_AUTH_MODES
  );
  const tokenSigningSecret = z
    .string()
    .parse(
      env.PLAYPULSE_INGEST_TOKEN_SIGNING_SECRET ??
        defaultIngestEnv.PLAYPULSE_INGEST_TOKEN_SIGNING_SECRET
    );
  const parsedPublicClients = parsePublicClients(
    env.PLAYPULSE_INGEST_PUBLIC_CLIENTS_JSON ??
      defaultIngestEnv.PLAYPULSE_INGEST_PUBLIC_CLIENTS_JSON
  );

  if (authModes.includes('bearer_token') && tokenSigningSecret.trim().length < 32) {
    throw new Error('PLAYPULSE_INGEST_TOKEN_SIGNING_SECRET must be at least 32 characters');
  }

  const apiKeys = parsedApiKeys.map((apiKey) => ({
    enabled: apiKey.enabled,
    gameId: apiKey.game_id,
    keyId: apiKey.key_id,
    signingSecret: apiKey.signing_secret,
  }));
  const publicClients = parsedPublicClients.map((client) => ({
    allowedBuildIds: client.allowed_build_ids,
    allowedGameVersions: client.allowed_game_versions,
    allowedOrigins: client.allowed_origins,
    clientId: client.client_id,
    enabled: client.enabled,
    eventRateLimit: {
      burst: client.event_rate_limit?.burst ?? sharedConfig.PLAYPULSE_RATE_LIMIT_PER_KEY_BURST,
      perMinute: client.event_rate_limit?.per_minute ?? sharedConfig.PLAYPULSE_RATE_LIMIT_PER_KEY,
    },
    gameId: client.game_id,
    platformChannel: client.platform_channel,
    tokenRateLimit: {
      burst: client.token_rate_limit?.burst ?? 120,
      perMinute: client.token_rate_limit?.per_minute ?? 60,
    },
    tokenTtlSeconds: client.token_ttl_seconds,
  }));

  return {
    ...sharedConfig,
    apiKeys,
    apiKeysById: new Map(apiKeys.map((apiKey) => [apiKey.keyId, apiKey])),
    authModes,
    ingestAllowedOrigins,
    ingestHost,
    ingestPort,
    ingestTrustProxy,
    publicClients,
    publicClientsById: new Map(publicClients.map((client) => [client.clientId, client])),
    tokenSigningSecret,
  };
};
