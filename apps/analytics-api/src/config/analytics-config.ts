import { readPlayPulseConfig, type PlayPulseConfig } from '@playpulse/config';
import { z } from 'zod';

export const defaultAnalyticsEnv = {
  PLAYPULSE_ANALYTICS_ALLOWED_ORIGINS: 'http://localhost:3000',
  PLAYPULSE_ANALYTICS_HOST: '0.0.0.0',
  PLAYPULSE_ANALYTICS_PORT: 4002,
  PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN: 'playpulse-local-private-token',
  PLAYPULSE_ANALYTICS_TRUST_PROXY: false,
} as const;

const parseBoolean = (value: string | boolean) => {
  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

export interface AnalyticsConfig extends PlayPulseConfig {
  analyticsAllowedOrigins: string[];
  analyticsHost: string;
  analyticsPort: number;
  analyticsPrivateBearerToken: string;
  analyticsTrustProxy: boolean;
}

export const readAnalyticsConfig = (
  env: Record<string, string | undefined> = process.env
): AnalyticsConfig => {
  const sharedConfig = readPlayPulseConfig(env);
  const analyticsPort = z.coerce
    .number()
    .int()
    .positive()
    .parse(env.PLAYPULSE_ANALYTICS_PORT ?? defaultAnalyticsEnv.PLAYPULSE_ANALYTICS_PORT);
  const analyticsHost = z
    .string()
    .min(1)
    .parse(env.PLAYPULSE_ANALYTICS_HOST ?? defaultAnalyticsEnv.PLAYPULSE_ANALYTICS_HOST);
  const analyticsAllowedOrigins = z
    .string()
    .parse(
      env.PLAYPULSE_ANALYTICS_ALLOWED_ORIGINS ??
        defaultAnalyticsEnv.PLAYPULSE_ANALYTICS_ALLOWED_ORIGINS
    )
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  const analyticsTrustProxy = parseBoolean(
    env.PLAYPULSE_ANALYTICS_TRUST_PROXY ?? defaultAnalyticsEnv.PLAYPULSE_ANALYTICS_TRUST_PROXY
  );
  const analyticsPrivateBearerToken = z
    .string()
    .min(1)
    .parse(
      env.PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN ??
        defaultAnalyticsEnv.PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN
    );

  return {
    ...sharedConfig,
    analyticsAllowedOrigins,
    analyticsHost,
    analyticsPort,
    analyticsPrivateBearerToken,
    analyticsTrustProxy,
  };
};
