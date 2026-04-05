// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PrivateInsightsView } from './private-insights-view';

vi.mock('./retention-cohorts-chart', () => ({
  RetentionCohortsChart: () => <div data-testid="retention-chart">retention chart</div>,
}));

describe('PrivateInsightsView', () => {
  it('renders retention chart and roadmap cards', () => {
    render(
      <PrivateInsightsView
        gameId="all"
        retentionResult={{
          data: {
            data: {
              cohorts: [
                {
                  cohort_date: '2026-03-16',
                  cohort_size: 20,
                  d1_retained: 17,
                  d1_retention_pct: 0.85,
                  d1_suppressed: false,
                  d7_retained: 11,
                  d7_retention_pct: 0.55,
                  d7_suppressed: false,
                },
              ],
              game_id: 'all',
              last_updated: '2026-04-05T12:00:00.000Z',
              weeks: 8,
            },
            request_id: 'req-retention',
          },
          status: 'success',
        }}
        weeks={8}
      />
    );

    expect(screen.getByTestId('retention-chart')).toBeInTheDocument();
    expect(screen.getByText('Monetization Signals')).toBeInTheDocument();
    expect(screen.getByText('Session Funnel Health')).toBeInTheDocument();
  });

  it('renders error state with retry affordance when retention fails', () => {
    render(
      <PrivateInsightsView
        gameId="mythclash"
        retentionResult={{
          message: 'Unable to reach the analytics API.',
          requestId: 'req-retention',
          status: 'error',
        }}
        weeks={4}
      />
    );

    expect(screen.getByText('Unable to load retention')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toHaveAttribute(
      'href',
      '/private-insights?game_id=mythclash&weeks=4'
    );
  });
});
