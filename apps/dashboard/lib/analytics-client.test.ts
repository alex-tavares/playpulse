import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchSummaryMetrics } from './analytics-client';
import type { DashboardConfig } from './dashboard-config';

const baseConfig: DashboardConfig = {
  PLAYPULSE_ANALYTICS_AVAILABILITY_TARGET: 99.9,
  PLAYPULSE_ANALYTICS_SLO_P95_MS: 300,
  PLAYPULSE_ANALYTICS_SLO_P99_MS: 600,
  PLAYPULSE_DATA_FRESHNESS_TARGET_MIN: 15,
  PLAYPULSE_DATABASE_URL: 'postgresql://playpulse:playpulse@localhost:5432/playpulse',
  PLAYPULSE_INGEST_AVAILABILITY_TARGET: 99.5,
  PLAYPULSE_INGEST_SLO_P95_MS: 500,
  PLAYPULSE_INGEST_SLO_P99_MS: 900,
  PLAYPULSE_RATE_LIMIT_PER_IP: 120,
  PLAYPULSE_RATE_LIMIT_PER_IP_BURST: 240,
  PLAYPULSE_RATE_LIMIT_PER_KEY: 600,
  PLAYPULSE_RATE_LIMIT_PER_KEY_BURST: 1200,
  PLAYPULSE_REPLAY_WINDOW_SECONDS: 300,
  PLAYPULSE_STORAGE_RETENTION_DAYS: 90,
  dashboardAnalyticsBaseUrl: 'http://localhost:4002',
  dashboardPrivateAccessCode: 'demo-code',
  dashboardPrivateApiBearerToken: 'private-token',
};

describe('analytics client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses successful analytics responses', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            game_id: 'all',
            last_updated: '2026-04-05T12:00:00.000Z',
            metrics: {
              active_players: { suppressed: false, value: 21 },
              avg_session_length_s: { suppressed: false, value: 1200 },
              matches_today: { suppressed: false, value: 15 },
            },
          },
          request_id: 'req-123',
        }),
        { status: 200 }
      )
    );

    const result = await fetchSummaryMetrics(baseConfig, 'all');

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.data.data.metrics.active_players.value).toBe(21);
    }
  });

  it('surfaces analytics error envelopes with request ids', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'internal_error',
            message: 'Unexpected server-side failure',
          },
          request_id: 'req-error',
        }),
        { status: 500 }
      )
    );

    const result = await fetchSummaryMetrics(baseConfig, 'all');

    expect(result).toEqual({
      code: 'internal_error',
      message: 'Unexpected server-side failure',
      requestId: 'req-error',
      status: 'error',
    });
  });
});
