import { describe, expect, it } from 'vitest';

import {
  formatCharacterPopularity,
  formatSessionsDailyPoints,
  formatSummaryMetrics,
  formatWeeklyRetentionCohorts,
} from './analytics-metrics-service';

describe('analytics metrics formatting', () => {
  const now = () => new Date('2026-04-05T12:00:00.000Z');

  it('suppresses aggregate summary metrics for public all-game responses', () => {
    const data = formatSummaryMetrics(
      [
        {
          activePlayers24h: 12,
          avgSessionLengthS24h: 1800,
          gameId: 'mythclash',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
          matchesToday: 11,
          suppressedActivePlayers: false,
          suppressedAvgSessionLength: false,
          suppressedMatchesToday: false,
        },
        {
          activePlayers24h: 5,
          avgSessionLengthS24h: 900,
          gameId: 'mythtag',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
          matchesToday: 4,
          suppressedActivePlayers: true,
          suppressedAvgSessionLength: true,
          suppressedMatchesToday: true,
        },
      ],
      'all',
      'public',
      now
    );

    expect(data.metrics.active_players).toEqual({
      suppressed: true,
      value: null,
    });
    expect(data.metrics.matches_today).toEqual({
      suppressed: true,
      value: null,
    });
  });

  it('preserves zero fill and suppresses all-game daily points when any title is suppressed', () => {
    const data = formatSessionsDailyPoints(
      [
        {
          activePlayers: 10,
          avgSessionLengthS: 1800,
          gameId: 'mythclash',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
          metricDate: new Date('2026-04-04T00:00:00.000Z'),
          sessionCount: 10,
          suppressed: false,
        },
        {
          activePlayers: 5,
          avgSessionLengthS: 900,
          gameId: 'mythtag',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
          metricDate: new Date('2026-04-05T00:00:00.000Z'),
          sessionCount: 5,
          suppressed: true,
        },
        {
          activePlayers: 12,
          avgSessionLengthS: 1800,
          gameId: 'mythclash',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
          metricDate: new Date('2026-04-05T00:00:00.000Z'),
          sessionCount: 12,
          suppressed: false,
        },
      ],
      'all',
      7,
      'public',
      now
    );

    const lastPoint = data.points.at(-1);

    expect(data.points).toHaveLength(7);
    expect(lastPoint).toEqual({
      active_players: null,
      avg_session_length_s: null,
      metric_date: '2026-04-05',
      session_count: null,
      suppressed: true,
    });
  });

  it('merges suppressed popularity rows into other for public responses', () => {
    const data = formatCharacterPopularity(
      [
        {
          characterId: 'warden',
          gameId: 'mythclash',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
          metricDate: new Date('2026-04-05T00:00:00.000Z'),
          pickCount: 12,
          pickRatio: 0.4,
          suppressed: false,
        },
        {
          characterId: 'seer',
          gameId: 'mythtag',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
          metricDate: new Date('2026-04-05T00:00:00.000Z'),
          pickCount: 10,
          pickRatio: 0.34,
          suppressed: false,
        },
        {
          characterId: 'shade_monk',
          gameId: 'mythclash',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
          metricDate: new Date('2026-04-05T00:00:00.000Z'),
          pickCount: 7,
          pickRatio: 0.24,
          suppressed: true,
        },
      ],
      'all',
      7,
      'public',
      now
    );

    expect(data.characters).toEqual([
      {
        character_id: 'warden',
        pick_count: 12,
        pick_ratio: 0.4138,
        suppressed: false,
      },
      {
        character_id: 'seer',
        pick_count: 10,
        pick_ratio: 0.3448,
        suppressed: false,
      },
      {
        character_id: 'other',
        pick_count: null,
        pick_ratio: 0.2414,
        suppressed: true,
      },
    ]);
  });

  it('rolls daily retention rows into weekly cohorts', () => {
    const data = formatWeeklyRetentionCohorts(
      [
        {
          cohortDate: new Date('2026-03-17T00:00:00.000Z'),
          cohortSize: 12,
          d1Retained: 10,
          d1RetentionPct: 0.8333,
          d1Suppressed: false,
          d7Retained: 8,
          d7RetentionPct: 0.6667,
          d7Suppressed: true,
          gameId: 'mythtag',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
        },
        {
          cohortDate: new Date('2026-03-16T00:00:00.000Z'),
          cohortSize: 8,
          d1Retained: 7,
          d1RetentionPct: 0.875,
          d1Suppressed: true,
          d7Retained: 3,
          d7RetentionPct: 0.375,
          d7Suppressed: true,
          gameId: 'mythclash',
          lastRefreshedAt: new Date('2026-04-05T12:00:00.000Z'),
        },
      ],
      'all',
      4,
      now
    );

    expect(data.cohorts[0]).toEqual({
      cohort_date: '2026-03-16',
      cohort_size: 20,
      d1_retained: 17,
      d1_retention_pct: 0.85,
      d1_suppressed: false,
      d7_retained: 11,
      d7_retention_pct: 0.55,
      d7_suppressed: false,
    });
  });
});
