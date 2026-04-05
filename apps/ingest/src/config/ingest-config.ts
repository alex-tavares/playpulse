import { gameIdSchema } from '@playpulse/schemas';
import { readPlayPulseConfig, type PlayPulseConfig } from '@playpulse/config';
import { z } from 'zod';

export const defaultIngestEnv = {
  PLAYPULSE_INGEST_ALLOWED_ORIGINS: 'http://localhost:3000',
  PLAYPULSE_INGEST_API_KEYS_JSON: '[]',
  PLAYPULSE_INGEST_HOST: '0.0.0.0',
  PLAYPULSE_INGEST_PORT: 4001,
  PLAYPULSE_INGEST_TRUST_PROXY: false,
} as const;

const ingestApiKeySchema = z.object({
  enabled: z.boolean(),
  game_id: gameIdSchema,
  key_id: z.string().min(1),
  signing_secret: z.string().min(1),
});

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

export interface IngestApiKeyConfig {
  enabled: boolean;
  gameId: 'mythclash' | 'mythtag';
  keyId: string;
  signingSecret: string;
}

export interface IngestConfig extends PlayPulseConfig {
  apiKeys: IngestApiKeyConfig[];
  apiKeysById: Map<string, IngestApiKeyConfig>;
  ingestAllowedOrigins: string[];
  ingestHost: string;
  ingestPort: number;
  ingestTrustProxy: boolean;
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
  const apiKeys = parsedApiKeys.map((apiKey) => ({
    enabled: apiKey.enabled,
    gameId: apiKey.game_id,
    keyId: apiKey.key_id,
    signingSecret: apiKey.signing_secret,
  }));

  return {
    ...sharedConfig,
    apiKeys,
    apiKeysById: new Map(apiKeys.map((apiKey) => [apiKey.keyId, apiKey])),
    ingestAllowedOrigins,
    ingestHost,
    ingestPort,
    ingestTrustProxy,
  };
};
