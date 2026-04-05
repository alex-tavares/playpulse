// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RetentionCohortsChart } from './retention-cohorts-chart';

vi.mock('recharts', () => {
  const passthrough = ({ children }: { children?: ReactNode }) => <div>{children}</div>;

  return {
    Bar: passthrough,
    BarChart: passthrough,
    CartesianGrid: passthrough,
    Tooltip: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
  };
});

describe('RetentionCohortsChart', () => {
  it('shows percentages and hidden count labels for suppressed cohorts', () => {
    render(
      <RetentionCohortsChart
        data={{
          cohorts: [
            {
              cohort_date: '2026-03-16',
              cohort_size: 20,
              d1_retained: null,
              d1_retention_pct: 0.425,
              d1_suppressed: true,
              d7_retained: null,
              d7_retention_pct: 0.15,
              d7_suppressed: true,
            },
          ],
          game_id: 'all',
          last_updated: '2026-04-05T12:00:00.000Z',
          weeks: 8,
        }}
      />
    );

    expect(screen.getByText('D1 42.5%')).toBeInTheDocument();
    expect(screen.getAllByText('<10 players')).toHaveLength(2);
  });
});
