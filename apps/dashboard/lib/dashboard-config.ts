import { readPlayPulseConfig, type PlayPulseConfig } from '@playpulse/config';
import { z } from 'zod';

export const defaultDashboardEnv = {
  PLAYPULSE_DASHBOARD_ANALYTICS_BASE_URL: 'http://localhost:4002',
  PLAYPULSE_DASHBOARD_PRIVATE_ACCESS_CODE: 'playpulse-demo-access',
  PLAYPULSE_DASHBOARD_PRIVATE_API_BEARER_TOKEN: 'playpulse-local-private-token',
} as const;

export interface DashboardConfig extends PlayPulseConfig {
  dashboardAnalyticsBaseUrl: string;
  dashboardPrivateAccessCode: string;
  dashboardPrivateApiBearerToken: string;
}

export const readDashboardConfig = (
  env: Record<string, string | undefined> = process.env
): DashboardConfig => {
  const sharedConfig = readPlayPulseConfig(env);

  return {
    ...sharedConfig,
    dashboardAnalyticsBaseUrl: z
      .string()
      .url()
      .parse(
        env.PLAYPULSE_DASHBOARD_ANALYTICS_BASE_URL ??
          defaultDashboardEnv.PLAYPULSE_DASHBOARD_ANALYTICS_BASE_URL
      ),
    dashboardPrivateAccessCode: z
      .string()
      .min(1)
      .parse(
        env.PLAYPULSE_DASHBOARD_PRIVATE_ACCESS_CODE ??
          defaultDashboardEnv.PLAYPULSE_DASHBOARD_PRIVATE_ACCESS_CODE
      ),
    dashboardPrivateApiBearerToken: z
      .string()
      .min(1)
      .parse(
        env.PLAYPULSE_DASHBOARD_PRIVATE_API_BEARER_TOKEN ??
          defaultDashboardEnv.PLAYPULSE_DASHBOARD_PRIVATE_API_BEARER_TOKEN
      ),
  };
};
