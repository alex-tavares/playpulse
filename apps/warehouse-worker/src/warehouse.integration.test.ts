import { createHash, randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createCharacterSelectedEvent,
  createMatchEndEvent,
  createSessionEndEvent,
  createSessionStartEvent,
} from '@playpulse/testkit';

import { readWarehouseConfig } from './config/warehouse-config';
import { addUtcDays, enumerateCalendarDates, startOfUtcDay } from './lib/date-range';
import type { DemoSeedEvent } from './lib/demo-data';
import { WarehouseRepo } from './repos/warehouse-repo';
import { DateDimensionService } from './services/date-dimension-service';
import { DemoSeedService } from './services/demo-seed-service';
import { RetentionRefreshService } from './services/retention-refresh-service';
import { RollingRefreshService } from './services/rolling-refresh-service';

const databaseUrl =
  process.env.PLAYPULSE_DATABASE_URL ?? 'postgresql://playpulse:playpulse@localhost:5432/playpulse';

const createPlayerHash = (seed: string) =>
  createHash('sha256').update(seed, 'utf8').digest('hex');

const dateKey = (value: Date) => value.toISOString().slice(0, 10);

const createWarehouseHarness = (prisma: PrismaClient, now: Date) => {
  const repo = new WarehouseRepo(prisma);
  const config = readWarehouseConfig({
    PLAYPULSE_DATABASE_URL: databaseUrl,
  });
  const dateDimensionService = new DateDimensionService(repo, config);
  const rollingRefreshService = new RollingRefreshService({
    ensureDimDateCoverage: () => dateDimensionService.ensureCoverage(),
    refreshCharacterPopularity: () => repo.refreshMaterializedView('mv_character_popularity'),
    refreshMetricsSummary: () => repo.refreshMaterializedView('mv_metrics_summary_current'),
    refreshSessionsDaily: () => repo.refreshMaterializedView('mv_sessions_daily'),
  });
  const retentionRefreshService = new RetentionRefreshService(repo, () => now);
  const demoSeedService = new DemoSeedService(repo, () => now);

  return {
    config,
    dateDimensionService,
    demoSeedService,
    repo,
    retentionRefreshService,
    rollingRefreshService,
  };
};

describe('warehouse worker integration', () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.retentionCohort.deleteMany();
    await prisma.eventRaw.deleteMany();
    await prisma.dimDate.deleteMany();
  });

  it('seeds dim_dates across the documented range and preserves uniqueness', async () => {
    const now = new Date('2026-04-05T12:00:00.000Z');
    const { config, dateDimensionService, repo } = createWarehouseHarness(prisma, now);
    const expectedCount = enumerateCalendarDates(config.dimDatesStart, config.dimDatesEnd).length;

    const firstInsertCount = await dateDimensionService.ensureCoverage();
    const secondInsertCount = await dateDimensionService.ensureCoverage();

    expect(firstInsertCount).toBe(expectedCount);
    expect(secondInsertCount).toBe(0);
    expect(await repo.countDimDates()).toBe(expectedCount);
  });

  it('refreshes sessions daily with zero fill and suppression flags', async () => {
    const now = new Date();
    const today = startOfUtcDay(now);
    const oldestDate = addUtcDays(today, -2);
    const middleDate = addUtcDays(today, -1);
    const latestDate = today;
    const { repo, rollingRefreshService } = createWarehouseHarness(prisma, now);
    const events: DemoSeedEvent[] = [];

    for (let index = 0; index < 10; index += 1) {
      events.push({
        apiKeyId: 'test-mythclash',
        event: createSessionEndEvent({
          build_id: 'mc-2026.04.05',
          event_id: randomUUID(),
          game_id: 'mythclash',
          occurred_at: new Date(
            Date.UTC(
              oldestDate.getUTCFullYear(),
              oldestDate.getUTCMonth(),
              oldestDate.getUTCDate(),
              18,
              index,
              0
            )
          ).toISOString(),
          player_id_hash: createPlayerHash(`sessions-oldest:${index}`),
          properties: {
            duration_s: 900 + index,
            exit_reason: 'user_exit',
            xp_earned: 100 + index,
          },
          session_id: randomUUID(),
        }),
      });
    }

    for (let index = 0; index < 8; index += 1) {
      events.push({
        apiKeyId: 'test-mythclash',
        event: createSessionEndEvent({
          build_id: 'mc-2026.04.05',
          event_id: randomUUID(),
          game_id: 'mythclash',
          occurred_at: new Date(
            Date.UTC(
              latestDate.getUTCFullYear(),
              latestDate.getUTCMonth(),
              latestDate.getUTCDate(),
              18,
              index,
              0
            )
          ).toISOString(),
          player_id_hash: createPlayerHash(`sessions-latest:${index}`),
          properties: {
            duration_s: 1500 + index,
            exit_reason: 'user_exit',
            xp_earned: 200 + index,
          },
          session_id: randomUUID(),
        }),
      });
    }

    events.push({
      apiKeyId: 'test-mythclash',
      event: createSessionEndEvent({
        build_id: 'mc-2026.04.05',
        consent_analytics: false,
        event_id: randomUUID(),
        game_id: 'mythclash',
        occurred_at: new Date(
          Date.UTC(
            latestDate.getUTCFullYear(),
            latestDate.getUTCMonth(),
            latestDate.getUTCDate(),
            20,
            0,
            0
          )
        ).toISOString(),
        player_id_hash: createPlayerHash('sessions-latest:consent-false'),
        session_id: randomUUID(),
      }),
    });

    await repo.seedRawEvents(events, 'integration_test');
    await rollingRefreshService.run();

    const rows = await repo.getSessionsDailyRows({
      endDate: dateKey(latestDate),
      gameId: 'mythclash',
      startDate: dateKey(oldestDate),
    });

    expect(
      rows.map((row) => ({
        activePlayers: row.activePlayers,
        metricDate: dateKey(row.metricDate),
        sessionCount: row.sessionCount,
        suppressed: row.suppressed,
      }))
    ).toEqual([
      {
        activePlayers: 10,
        metricDate: dateKey(oldestDate),
        sessionCount: 10,
        suppressed: false,
      },
      {
        activePlayers: 0,
        metricDate: dateKey(middleDate),
        sessionCount: 0,
        suppressed: false,
      },
      {
        activePlayers: 8,
        metricDate: dateKey(latestDate),
        sessionCount: 8,
        suppressed: true,
      },
    ]);
  });

  it('refreshes character popularity with ratios and suppression flags', async () => {
    const now = new Date();
    const today = startOfUtcDay(now);
    const { repo, rollingRefreshService } = createWarehouseHarness(prisma, now);
    const events: DemoSeedEvent[] = [];

    for (let index = 0; index < 12; index += 1) {
      events.push({
        apiKeyId: 'test-mythclash',
        event: createCharacterSelectedEvent({
          build_id: 'mc-2026.04.05',
          event_id: randomUUID(),
          game_id: 'mythclash',
          occurred_at: new Date(
            Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 14, index, 0)
          ).toISOString(),
          player_id_hash: createPlayerHash(`popularity:warden:${index}`),
          properties: {
            character_id: 'warden',
            is_random: false,
            loadout_id: 'loadout_warden',
            perk_ids: ['quick_step', 'iron_will'],
            selection_context: 'match_lobby',
          },
          session_id: randomUUID(),
        }),
      });
    }

    for (let index = 0; index < 4; index += 1) {
      events.push({
        apiKeyId: 'test-mythclash',
        event: createCharacterSelectedEvent({
          build_id: 'mc-2026.04.05',
          event_id: randomUUID(),
          game_id: 'mythclash',
          occurred_at: new Date(
            Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 15, index, 0)
          ).toISOString(),
          player_id_hash: createPlayerHash(`popularity:shade:${index}`),
          properties: {
            character_id: 'shade_monk',
            is_random: false,
            loadout_id: 'loadout_shade',
            perk_ids: ['quick_step'],
            selection_context: 'match_lobby',
          },
          session_id: randomUUID(),
        }),
      });
    }

    events.push({
      apiKeyId: 'test-mythclash',
      event: createCharacterSelectedEvent({
        build_id: 'mc-2026.04.05',
        consent_analytics: false,
        event_id: randomUUID(),
        game_id: 'mythclash',
        occurred_at: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 16, 0, 0)
        ).toISOString(),
        player_id_hash: createPlayerHash('popularity:ignored'),
        properties: {
          character_id: 'shade_monk',
          is_random: false,
          loadout_id: 'loadout_shade',
          perk_ids: ['quick_step'],
          selection_context: 'match_lobby',
        },
        session_id: randomUUID(),
      }),
    });

    await repo.seedRawEvents(events, 'integration_test');
    await rollingRefreshService.run();

    const rows = await repo.getCharacterPopularityRows({
      endDate: dateKey(today),
      gameId: 'mythclash',
      startDate: dateKey(today),
    });

    const rowByCharacter = new Map(rows.map((row) => [row.characterId, row]));
    const warden = rowByCharacter.get('warden');
    const shadeMonk = rowByCharacter.get('shade_monk');

    expect(warden).toMatchObject({
      pickCount: 12,
      suppressed: false,
    });
    expect(warden?.pickRatio).toBeCloseTo(0.75, 5);
    expect(shadeMonk).toMatchObject({
      pickCount: 4,
      suppressed: true,
    });
    expect(shadeMonk?.pickRatio).toBeCloseTo(0.25, 5);
  });

  it('rebuilds retention cohorts for d1 and d7 windows', async () => {
    const now = new Date('2026-04-05T12:00:00.000Z');
    const { repo, retentionRefreshService } = createWarehouseHarness(prisma, now);
    const mythtagCohortDate = addUtcDays(startOfUtcDay(now), -8);
    const mythclashCohortDate = addUtcDays(startOfUtcDay(now), -15);
    const events: DemoSeedEvent[] = [];

    for (let index = 0; index < 12; index += 1) {
      const playerHash = createPlayerHash(`retention:mythtag:${index}`);
      const cohortStartAt = new Date(
        Date.UTC(
          mythtagCohortDate.getUTCFullYear(),
          mythtagCohortDate.getUTCMonth(),
          mythtagCohortDate.getUTCDate(),
          11,
          index,
          0
        )
      );

      events.push({
        apiKeyId: 'test-mythtag',
        event: createSessionStartEvent({
          event_id: randomUUID(),
          game_id: 'mythtag',
          occurred_at: cohortStartAt.toISOString(),
          player_id_hash: playerHash,
          session_id: randomUUID(),
        }),
      });

      if (index < 10) {
        events.push({
          apiKeyId: 'test-mythtag',
          event: createSessionStartEvent({
            event_id: randomUUID(),
            game_id: 'mythtag',
            occurred_at: addUtcDays(cohortStartAt, 1).toISOString(),
            player_id_hash: playerHash,
            session_id: randomUUID(),
          }),
        });
      }

      if (index < 8) {
        events.push({
          apiKeyId: 'test-mythtag',
          event: createSessionStartEvent({
            event_id: randomUUID(),
            game_id: 'mythtag',
            occurred_at: addUtcDays(cohortStartAt, 7).toISOString(),
            player_id_hash: playerHash,
            session_id: randomUUID(),
          }),
        });
      }
    }

    for (let index = 0; index < 8; index += 1) {
      const playerHash = createPlayerHash(`retention:mythclash:${index}`);
      const cohortStartAt = new Date(
        Date.UTC(
          mythclashCohortDate.getUTCFullYear(),
          mythclashCohortDate.getUTCMonth(),
          mythclashCohortDate.getUTCDate(),
          9,
          index,
          0
        )
      );

      events.push({
        apiKeyId: 'test-mythclash',
        event: createSessionStartEvent({
          event_id: randomUUID(),
          game_id: 'mythclash',
          occurred_at: cohortStartAt.toISOString(),
          player_id_hash: playerHash,
          session_id: randomUUID(),
        }),
      });

      if (index < 7) {
        events.push({
          apiKeyId: 'test-mythclash',
          event: createSessionStartEvent({
            event_id: randomUUID(),
            game_id: 'mythclash',
            occurred_at: addUtcDays(cohortStartAt, 1).toISOString(),
            player_id_hash: playerHash,
            session_id: randomUUID(),
          }),
        });
      }

      if (index < 3) {
        events.push({
          apiKeyId: 'test-mythclash',
          event: createSessionStartEvent({
            event_id: randomUUID(),
            game_id: 'mythclash',
            occurred_at: addUtcDays(cohortStartAt, 7).toISOString(),
            player_id_hash: playerHash,
            session_id: randomUUID(),
          }),
        });
      }
    }

    await repo.seedRawEvents(events, 'integration_test');
    await retentionRefreshService.run();

    const rows = await repo.getRetentionCohorts();
    const mythtagRow = rows.find(
      (row) => row.gameId === 'mythtag' && dateKey(row.cohortDate) === dateKey(mythtagCohortDate)
    );
    const mythclashRow = rows.find(
      (row) =>
        row.gameId === 'mythclash' && dateKey(row.cohortDate) === dateKey(mythclashCohortDate)
    );

    expect(mythtagRow).toMatchObject({
      cohortSize: 12,
      d1Retained: 10,
      d1Suppressed: false,
      d7Retained: 8,
      d7Suppressed: true,
    });
    expect(mythtagRow?.d1RetentionPct).toBeCloseTo(10 / 12, 4);
    expect(mythtagRow?.d7RetentionPct).toBeCloseTo(8 / 12, 4);
    expect(mythclashRow).toMatchObject({
      cohortSize: 8,
      d1Retained: 7,
      d1Suppressed: true,
      d7Retained: 3,
      d7Suppressed: true,
    });
  });

  it('refreshes the current metrics summary for recent consented events', async () => {
    const now = new Date();
    const { repo, rollingRefreshService } = createWarehouseHarness(prisma, now);
    const events: DemoSeedEvent[] = [];

    for (let index = 0; index < 12; index += 1) {
      const occurredAt = new Date(now.getTime() - index * 30 * 60 * 1000);
      const playerIdHash = createPlayerHash(`summary:session:${index}`);

      events.push({
        apiKeyId: 'test-mythclash',
        event: createSessionEndEvent({
          build_id: 'mc-2026.04.05',
          event_id: randomUUID(),
          game_id: 'mythclash',
          occurred_at: occurredAt.toISOString(),
          player_id_hash: playerIdHash,
          properties: {
            duration_s: 1800,
            exit_reason: 'user_exit',
            xp_earned: 250,
          },
          session_id: randomUUID(),
        }),
      });
    }

    for (let index = 0; index < 11; index += 1) {
      const occurredAt = new Date(now.getTime() - index * 25 * 60 * 1000);

      events.push({
        apiKeyId: 'test-mythclash',
        event: createMatchEndEvent({
          build_id: 'mc-2026.04.05',
          event_id: randomUUID(),
          game_id: 'mythclash',
          occurred_at: occurredAt.toISOString(),
          player_id_hash: createPlayerHash(`summary:match:${index}`),
          properties: {
            character_id: 'warden',
            damage_dealt: 12000 + index,
            duration_s: 900,
            match_id: randomUUID(),
            result: 'win',
            score: 2000 + index,
          },
          session_id: randomUUID(),
        }),
      });
    }

    events.push({
      apiKeyId: 'test-mythclash',
      event: createSessionEndEvent({
        build_id: 'mc-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythclash',
        occurred_at: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(),
        player_id_hash: createPlayerHash('summary:old-session'),
        session_id: randomUUID(),
      }),
    });

    events.push({
      apiKeyId: 'test-mythclash',
      event: createSessionEndEvent({
        build_id: 'mc-2026.04.05',
        consent_analytics: false,
        event_id: randomUUID(),
        game_id: 'mythclash',
        occurred_at: now.toISOString(),
        player_id_hash: createPlayerHash('summary:ignored-session'),
        session_id: randomUUID(),
      }),
    });

    await repo.seedRawEvents(events, 'integration_test');
    await rollingRefreshService.run();

    const rows = await repo.getMetricsSummaryRows();
    const mythclash = rows.find((row) => row.gameId === 'mythclash');
    const mythtag = rows.find((row) => row.gameId === 'mythtag');

    expect(mythclash).toMatchObject({
      activePlayers24h: 12,
      avgSessionLengthS24h: 1800,
      matchesToday: 11,
      suppressedActivePlayers: false,
      suppressedAvgSessionLength: false,
      suppressedMatchesToday: false,
    });
    expect(mythtag).toMatchObject({
      activePlayers24h: 0,
      avgSessionLengthS24h: 0,
      matchesToday: 0,
      suppressedActivePlayers: false,
      suppressedAvgSessionLength: false,
      suppressedMatchesToday: false,
    });
  });

  it('seeds demo data for both games and refreshes all derived structures', async () => {
    const now = new Date();
    const today = startOfUtcDay(now);
    const firstWindowDate = addUtcDays(today, -13);
    const { demoSeedService, repo, retentionRefreshService, rollingRefreshService } =
      createWarehouseHarness(prisma, now);

    const seedResult = await demoSeedService.run();
    await rollingRefreshService.run();
    await retentionRefreshService.run();

    const sessionsDaily = await repo.getSessionsDailyRows({
      endDate: dateKey(today),
      startDate: dateKey(firstWindowDate),
    });
    const popularity = await repo.getCharacterPopularityRows({
      endDate: dateKey(today),
      startDate: dateKey(firstWindowDate),
    });
    const retention = await repo.getRetentionCohorts();
    const recentRetention = retention.filter((row) => row.cohortDate >= addUtcDays(today, -56));

    expect(seedResult.generatedCount).toBeGreaterThan(0);
    expect(seedResult.insertedCount).toBe(seedResult.generatedCount);
    expect(await repo.countEventRawByGame('mythclash')).toBeGreaterThan(0);
    expect(await repo.countEventRawByGame('mythtag')).toBeGreaterThan(0);
    expect(sessionsDaily.filter((row) => row.gameId === 'mythclash')).toHaveLength(14);
    expect(sessionsDaily.filter((row) => row.gameId === 'mythtag')).toHaveLength(14);
    expect(popularity.some((row) => row.gameId === 'mythclash')).toBe(true);
    expect(popularity.some((row) => row.gameId === 'mythtag')).toBe(true);
    expect(popularity.some((row) => row.suppressed)).toBe(true);
    expect(sessionsDaily.some((row) => row.suppressed)).toBe(true);
    expect(retention.filter((row) => row.gameId === 'mythclash').length).toBeGreaterThanOrEqual(8);
    expect(retention.filter((row) => row.gameId === 'mythtag').length).toBeGreaterThanOrEqual(8);
    expect(recentRetention.some((row) => row.d1Retained > 0)).toBe(true);
    expect(recentRetention.some((row) => row.d7Retained > 0)).toBe(true);
    expect(Math.max(...recentRetention.map((row) => row.cohortSize))).toBeLessThan(20);
  });
});
