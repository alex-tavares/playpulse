// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PublicMetricsView } from './public-metrics-view';

vi.mock('./sessions-chart', () => ({
  SessionsChart: () => <div data-testid="sessions-chart">sessions chart</div>,
}));

vi.mock('./character-popularity-chart', () => ({
  CharacterPopularityChart: () => (
    <div data-testid="character-popularity-chart">character popularity chart</div>
  ),
}));

describe('PublicMetricsView', () => {
  it('renders KPI strip and public chart cards', () => {
    render(
      <PublicMetricsView
        popularityDays={7}
        popularityResult={{
          data: {
            data: {
              characters: [
                { character_id: 'warden', pick_count: 12, pick_ratio: 0.6, suppressed: false },
                { character_id: 'other', pick_count: null, pick_ratio: 0.4, suppressed: true },
              ],
              days: 7,
              game_id: 'all',
              last_updated: '2026-04-05T12:00:00.000Z',
            },
            request_id: 'req-popularity',
          },
          status: 'success',
        }}
        sessionsDays={14}
        sessionsResult={{
          data: {
            data: {
              days: 14,
              game_id: 'all',
              last_updated: '2026-04-05T12:00:00.000Z',
              points: [
                {
                  active_players: 20,
                  avg_session_length_s: 1200,
                  metric_date: '2026-04-04',
                  session_count: 24,
                  suppressed: false,
                },
              ],
            },
            request_id: 'req-sessions',
          },
          status: 'success',
        }}
        summaryResult={{
          data: {
            data: {
              game_id: 'all',
              last_updated: '2026-04-05T12:00:00.000Z',
              metrics: {
                active_players: { suppressed: false, value: 21 },
                avg_session_length_s: { suppressed: false, value: 1200 },
                matches_today: { suppressed: false, value: 15 },
              },
            },
            request_id: 'req-summary',
          },
          status: 'success',
        }}
      />
    );

    expect(screen.getByText('Active Players')).toBeInTheDocument();
    expect(screen.getByTestId('sessions-chart')).toBeInTheDocument();
    expect(screen.getByTestId('character-popularity-chart')).toBeInTheDocument();
  });

  it('renders empty state when too many time-series points are suppressed', () => {
    render(
      <PublicMetricsView
        popularityDays={7}
        popularityResult={{
          data: {
            data: {
              characters: [{ character_id: 'other', pick_count: null, pick_ratio: 1, suppressed: true }],
              days: 7,
              game_id: 'all',
              last_updated: '2026-04-05T12:00:00.000Z',
            },
            request_id: 'req-popularity',
          },
          status: 'success',
        }}
        sessionsDays={14}
        sessionsResult={{
          data: {
            data: {
              days: 14,
              game_id: 'all',
              last_updated: '2026-04-05T12:00:00.000Z',
              points: [
                {
                  active_players: null,
                  avg_session_length_s: null,
                  metric_date: '2026-04-04',
                  session_count: null,
                  suppressed: true,
                },
                {
                  active_players: null,
                  avg_session_length_s: null,
                  metric_date: '2026-04-05',
                  session_count: null,
                  suppressed: true,
                },
              ],
            },
            request_id: 'req-sessions',
          },
          status: 'success',
        }}
        summaryResult={{
          data: {
            data: {
              game_id: 'all',
              last_updated: '2026-04-05T12:00:00.000Z',
              metrics: {
                active_players: { suppressed: false, value: 21 },
                avg_session_length_s: { suppressed: false, value: 1200 },
                matches_today: { suppressed: false, value: 15 },
              },
            },
            request_id: 'req-summary',
          },
          status: 'success',
        }}
      />
    );

    expect(screen.getByText('Sessions data is still too sparse')).toBeInTheDocument();
    expect(screen.getByText('Character picks are fully anonymized right now')).toBeInTheDocument();
  });
});
