import {
  analyticsCharacterPopularityResponseSchema,
  analyticsRetentionCohortsResponseSchema,
  analyticsSessionsDailyResponseSchema,
  analyticsSummaryResponseSchema,
  type AnalyticsCharacterPopularityResponse,
  type AnalyticsQueryGameId,
  type AnalyticsRetentionCohortsResponse,
  type AnalyticsSessionsDailyResponse,
  type AnalyticsSummaryResponse,
} from '@playpulse/schemas';
import { z } from 'zod';

import type { DashboardConfig } from './dashboard-config';

const analyticsErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  request_id: z.string().optional(),
});

export interface AnalyticsSuccessResult<T> {
  data: T;
  status: 'success';
}

export interface AnalyticsErrorResult {
  code?: string;
  message: string;
  requestId?: string;
  status: 'error';
}

export type AnalyticsFetchResult<T> = AnalyticsSuccessResult<T> | AnalyticsErrorResult;

const buildUrl = (
  config: DashboardConfig,
  pathname: string,
  searchParams: Record<string, string | number | undefined>
) => {
  const url = new URL(pathname, config.dashboardAnalyticsBaseUrl);

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  }

  return url;
};

const fetchFromAnalytics = async <T>(
  config: DashboardConfig,
  pathname: string,
  schema: z.ZodType<T>,
  searchParams: Record<string, string | number | undefined>,
  init?: RequestInit
): Promise<AnalyticsFetchResult<T>> => {
  try {
    const response = await fetch(buildUrl(config, pathname, searchParams), {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(init?.headers ?? {}),
      },
    });
    const payload = await response.json().catch(() => undefined);

    if (!response.ok) {
      const parsedError = analyticsErrorEnvelopeSchema.safeParse(payload);

      if (parsedError.success) {
        return {
          code: parsedError.data.error.code,
          message: parsedError.data.error.message,
          requestId: parsedError.data.request_id,
          status: 'error',
        };
      }

      return {
        message: 'Analytics API returned an unexpected error response.',
        status: 'error',
      };
    }

    return {
      data: schema.parse(payload),
      status: 'success',
    };
  } catch {
    return {
      message: 'Unable to reach the analytics API.',
      status: 'error',
    };
  }
};

export const fetchSummaryMetrics = (
  config: DashboardConfig,
  gameId: AnalyticsQueryGameId = 'all'
) =>
  fetchFromAnalytics<AnalyticsSummaryResponse>(config, '/metrics/summary', analyticsSummaryResponseSchema, {
    game_id: gameId,
  });

export const fetchSessionsDaily = (
  config: DashboardConfig,
  gameId: AnalyticsQueryGameId,
  days: 7 | 14 | 30
) =>
  fetchFromAnalytics<AnalyticsSessionsDailyResponse>(
    config,
    '/metrics/sessions/daily',
    analyticsSessionsDailyResponseSchema,
    {
      days,
      game_id: gameId,
    }
  );

export const fetchCharacterPopularity = (
  config: DashboardConfig,
  gameId: AnalyticsQueryGameId,
  days: 7 | 14
) =>
  fetchFromAnalytics<AnalyticsCharacterPopularityResponse>(
    config,
    '/metrics/characters/popularity',
    analyticsCharacterPopularityResponseSchema,
    {
      days,
      game_id: gameId,
    }
  );

export const fetchRetentionCohorts = (
  config: DashboardConfig,
  gameId: AnalyticsQueryGameId,
  weeks: number
) =>
  fetchFromAnalytics<AnalyticsRetentionCohortsResponse>(
    config,
    '/metrics/retention/cohorts',
    analyticsRetentionCohortsResponseSchema,
    {
      game_id: gameId,
      weeks,
    },
    {
      headers: {
        Authorization: `Bearer ${config.dashboardPrivateApiBearerToken}`,
      },
    }
  );
