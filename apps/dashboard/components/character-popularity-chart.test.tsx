// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { render, screen } from '@testing-library/react';
import React from 'react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { CharacterPopularityChart } from './character-popularity-chart';

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

describe('CharacterPopularityChart', () => {
  it('renders visible characters and the merged other bucket', () => {
    render(
      <CharacterPopularityChart
        data={{
          characters: [
            { character_id: 'warden', pick_count: 12, pick_ratio: 0.6, suppressed: false },
            { character_id: 'other', pick_count: null, pick_ratio: 0.4, suppressed: true },
          ],
          days: 7,
          game_id: 'all',
          last_updated: '2026-04-05T12:00:00.000Z',
        }}
      />
    );

    expect(screen.getByText('warden')).toBeInTheDocument();
    expect(screen.getByText('other')).toBeInTheDocument();
    expect(screen.getByText('Merged to protect player privacy')).toBeInTheDocument();
  });
});
