import { describe, expect, it } from 'vitest';

import { deriveRetentionCohorts } from './retention';

describe('deriveRetentionCohorts', () => {
  it('cohorts by first consented session day and computes d1 and d7 returns', () => {
    const refreshedAt = new Date('2026-04-05T12:00:00.000Z');
    const cohorts = deriveRetentionCohorts(
      [
        {
          gameId: 'mythclash',
          occurredAt: new Date('2026-03-29T18:00:00.000Z'),
          playerIdHash: 'player-2',
        },
        {
          gameId: 'mythclash',
          occurredAt: new Date('2026-03-28T18:00:00.000Z'),
          playerIdHash: 'player-1',
        },
        {
          gameId: 'mythclash',
          occurredAt: new Date('2026-03-29T18:00:00.000Z'),
          playerIdHash: 'player-1',
        },
        {
          gameId: 'mythclash',
          occurredAt: new Date('2026-04-04T18:00:00.000Z'),
          playerIdHash: 'player-1',
        },
        {
          gameId: 'mythtag',
          occurredAt: new Date('2026-03-30T10:00:00.000Z'),
          playerIdHash: 'player-a',
        },
        {
          gameId: 'mythtag',
          occurredAt: new Date('2026-03-31T11:00:00.000Z'),
          playerIdHash: 'player-a',
        },
      ],
      refreshedAt
    );

    expect(
      cohorts.map((cohort) => ({
        cohortDate: cohort.cohortDate.toISOString().slice(0, 10),
        cohortSize: cohort.cohortSize,
        d1RetentionPct: cohort.d1RetentionPct,
        d1Retained: cohort.d1Retained,
        d1Suppressed: cohort.d1Suppressed,
        d7RetentionPct: cohort.d7RetentionPct,
        d7Retained: cohort.d7Retained,
        d7Suppressed: cohort.d7Suppressed,
        gameId: cohort.gameId,
      }))
    ).toEqual([
      {
        cohortDate: '2026-03-28',
        cohortSize: 1,
        d1RetentionPct: 1,
        d1Retained: 1,
        d1Suppressed: true,
        d7RetentionPct: 1,
        d7Retained: 1,
        d7Suppressed: true,
        gameId: 'mythclash',
      },
      {
        cohortDate: '2026-03-29',
        cohortSize: 1,
        d1RetentionPct: 0,
        d1Retained: 0,
        d1Suppressed: false,
        d7RetentionPct: 0,
        d7Retained: 0,
        d7Suppressed: false,
        gameId: 'mythclash',
      },
      {
        cohortDate: '2026-03-30',
        cohortSize: 1,
        d1RetentionPct: 1,
        d1Retained: 1,
        d1Suppressed: true,
        d7RetentionPct: 0,
        d7Retained: 0,
        d7Suppressed: false,
        gameId: 'mythtag',
      },
    ]);
    expect(cohorts.every((cohort) => cohort.lastRefreshedAt === refreshedAt)).toBe(true);
  });
});
