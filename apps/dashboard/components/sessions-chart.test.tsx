// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SessionsChart } from './sessions-chart';

vi.mock('recharts', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

  return {
    CartesianGrid: passthrough,
    Line: passthrough,
    LineChart: passthrough,
    ReferenceDot: () => <span>reference-dot</span>,
    Tooltip: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
  };
});

describe('SessionsChart', () => {
  it('renders suppression badges for hidden points', () => {
    render(
      <SessionsChart
        data={{
          days: 14,
          game_id: 'all',
          last_updated: '2026-04-05T12:00:00.000Z',
          points: [
            {
              active_players: 12,
              avg_session_length_s: 1200,
              metric_date: '2026-04-04',
              session_count: 18,
              suppressed: false,
            },
            {
              active_players: null,
              avg_session_length_s: null,
              metric_date: '2026-04-05',
              session_count: null,
              suppressed: true,
            },
          ],
        }}
      />
    );

    expect(screen.getByText('Hidden 2026-04-05')).toBeInTheDocument();
  });
});
