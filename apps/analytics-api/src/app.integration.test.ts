import { createHash, randomUUID } from 'node:crypto';

import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  createCharacterSelectedEvent,
  createMatchEndEvent,
  createSessionEndEvent,
  createSessionStartEvent,
} from '@playpulse/testkit';

import { createAnalyticsApp } from './app';
import { readAnalyticsConfig } from './config/analytics-config';
import { addUtcDays, startOfUtcDay, startOfUtcWeek, toDateKey } from './lib/date';
import { createLogger } from './lib/logger';
import { readWarehouseConfig } from '../../warehouse-worker/src/config/warehouse-config';
import type { DemoSeedEvent } from '../../warehouse-worker/src/lib/demo-data';
import { WarehouseRepo } from '../../warehouse-worker/src/repos/warehouse-repo';
import { DateDimensionService } from '../../warehouse-worker/src/services/date-dimension-service';
import { RetentionRefreshService } from '../../warehouse-worker/src/services/retention-refresh-service';
import { RollingRefreshService } from '../../warehouse-worker/src/services/rolling-refresh-service';

const databaseUrl =
  process.env.PLAYPULSE_DATABASE_URL ?? 'postgresql://playpulse:playpulse@localhost:5432/playpulse';

const createPlayerHash = (seed: string) =>
  createHash('sha256').update(seed, 'utf8').digest('hex');

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

  return {
    repo,
    retentionRefreshService,
    rollingRefreshService,
  };
};

const seedRetentionCohort = (
  events: DemoSeedEvent[],
  params: {
    d1Retained: number;
    d7Retained: number;
    gameId: 'mythclash' | 'mythtag';
    playerCount: number;
    weekStart: Date;
  }
) => {
  for (let index = 0; index < params.playerCount; index += 1) {
    const cohortStart = new Date(
      Date.UTC(
        params.weekStart.getUTCFullYear(),
        params.weekStart.getUTCMonth(),
        params.weekStart.getUTCDate() + (params.gameId === 'mythtag' ? 1 : 0),
        12,
        index,
        0
      )
    );
    const playerIdHash = createPlayerHash(
      `retention:${params.gameId}:${toDateKey(params.weekStart)}:${index}`
    );

    events.push({
      apiKeyId: `test-${params.gameId}`,
      event: createSessionStartEvent({
        event_id: randomUUID(),
        game_id: params.gameId,
        occurred_at: cohortStart.toISOString(),
        player_id_hash: playerIdHash,
        session_id: randomUUID(),
      }),
    });

    if (index < params.d1Retained) {
      events.push({
        apiKeyId: `test-${params.gameId}`,
        event: createSessionStartEvent({
          event_id: randomUUID(),
          game_id: params.gameId,
          occurred_at: addUtcDays(cohortStart, 1).toISOString(),
          player_id_hash: playerIdHash,
          session_id: randomUUID(),
        }),
      });
    }

    if (index < params.d7Retained) {
      events.push({
        apiKeyId: `test-${params.gameId}`,
        event: createSessionStartEvent({
          event_id: randomUUID(),
          game_id: params.gameId,
          occurred_at: addUtcDays(cohortStart, 7).toISOString(),
          player_id_hash: playerIdHash,
          session_id: randomUUID(),
        }),
      });
    }
  }
};

const seedAnalyticsFixture = async (prisma: PrismaClient, now: Date) => {
  const { repo, retentionRefreshService, rollingRefreshService } = createWarehouseHarness(prisma, now);
  const today = startOfUtcDay(now);
  const twoDaysAgo = addUtcDays(today, -2);
  const currentWeek = startOfUtcWeek(today);
  const olderWeek = addUtcDays(currentWeek, -14);
  const oldestWeek = addUtcDays(currentWeek, -21);
  const events: DemoSeedEvent[] = [];

  await prisma.retentionCohort.deleteMany();
  await prisma.eventRaw.deleteMany();
  await prisma.dimDate.deleteMany();

  for (let index = 0; index < 12; index += 1) {
    events.push({
      apiKeyId: 'test-mythclash',
      event: createSessionEndEvent({
        build_id: 'mc-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythclash',
        occurred_at: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 18, index, 0)
        ).toISOString(),
        player_id_hash: createPlayerHash(`summary:mythclash:${index}`),
        properties: {
          duration_s: 1800,
          exit_reason: 'user_exit',
          xp_earned: 250,
        },
        session_id: randomUUID(),
      }),
    });
  }

  for (let index = 0; index < 5; index += 1) {
    events.push({
      apiKeyId: 'test-mythtag',
      event: createSessionEndEvent({
        build_id: 'mt-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythtag',
        occurred_at: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 19, index, 0)
        ).toISOString(),
        player_id_hash: createPlayerHash(`summary:mythtag:${index}`),
        properties: {
          duration_s: 900,
          exit_reason: 'user_exit',
          xp_earned: 120,
        },
        session_id: randomUUID(),
      }),
    });
  }

  for (let index = 0; index < 10; index += 1) {
    events.push({
      apiKeyId: 'test-mythclash',
      event: createSessionEndEvent({
        build_id: 'mc-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythclash',
        occurred_at: new Date(
          Date.UTC(
            twoDaysAgo.getUTCFullYear(),
            twoDaysAgo.getUTCMonth(),
            twoDaysAgo.getUTCDate(),
            18,
            index,
            0
          )
        ).toISOString(),
        player_id_hash: createPlayerHash(`sessions:mythclash:${index}`),
        properties: {
          duration_s: 1500,
          exit_reason: 'user_exit',
          xp_earned: 180,
        },
        session_id: randomUUID(),
      }),
    });
    events.push({
      apiKeyId: 'test-mythtag',
      event: createSessionEndEvent({
        build_id: 'mt-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythtag',
        occurred_at: new Date(
          Date.UTC(
            twoDaysAgo.getUTCFullYear(),
            twoDaysAgo.getUTCMonth(),
            twoDaysAgo.getUTCDate(),
            19,
            index,
            0
          )
        ).toISOString(),
        player_id_hash: createPlayerHash(`sessions:mythtag:${index}`),
        properties: {
          duration_s: 1200,
          exit_reason: 'user_exit',
          xp_earned: 160,
        },
        session_id: randomUUID(),
      }),
    });
  }

  for (let index = 0; index < 11; index += 1) {
    events.push({
      apiKeyId: 'test-mythclash',
      event: createMatchEndEvent({
        build_id: 'mc-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythclash',
        occurred_at: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 20, index, 0)
        ).toISOString(),
        player_id_hash: createPlayerHash(`matches:mythclash:${index}`),
        properties: {
          character_id: 'warden',
          damage_dealt: 12000,
          duration_s: 900,
          match_id: randomUUID(),
          result: 'win',
          score: 2000,
        },
        session_id: randomUUID(),
      }),
    });
  }

  for (let index = 0; index < 4; index += 1) {
    events.push({
      apiKeyId: 'test-mythtag',
      event: createMatchEndEvent({
        build_id: 'mt-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythtag',
        occurred_at: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 21, index, 0)
        ).toISOString(),
        player_id_hash: createPlayerHash(`matches:mythtag:${index}`),
        properties: {
          character_id: 'seer',
          damage_dealt: 9000,
          duration_s: 780,
          match_id: randomUUID(),
          result: 'win',
          score: 1700,
        },
        session_id: randomUUID(),
      }),
    });
  }

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

  for (let index = 0; index < 10; index += 1) {
    events.push({
      apiKeyId: 'test-mythtag',
      event: createCharacterSelectedEvent({
        build_id: 'mt-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythtag',
        occurred_at: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 16, index, 0)
        ).toISOString(),
        player_id_hash: createPlayerHash(`popularity:seer:${index}`),
        properties: {
          character_id: 'seer',
          is_random: false,
          loadout_id: 'loadout_seer',
          perk_ids: ['quick_step'],
          selection_context: 'match_lobby',
        },
        session_id: randomUUID(),
      }),
    });
  }

  for (let index = 0; index < 3; index += 1) {
    events.push({
      apiKeyId: 'test-mythtag',
      event: createCharacterSelectedEvent({
        build_id: 'mt-2026.04.05',
        event_id: randomUUID(),
        game_id: 'mythtag',
        occurred_at: new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 17, index, 0)
        ).toISOString(),
        player_id_hash: createPlayerHash(`popularity:trickster:${index}`),
        properties: {
          character_id: 'trickster',
          is_random: false,
          loadout_id: 'loadout_trickster',
          perk_ids: ['quick_step'],
          selection_context: 'match_lobby',
        },
        session_id: randomUUID(),
      }),
    });
  }

  seedRetentionCohort(events, {
    d1Retained: 7,
    d7Retained: 3,
    gameId: 'mythclash',
    playerCount: 8,
    weekStart: oldestWeek,
  });
  seedRetentionCohort(events, {
    d1Retained: 10,
    d7Retained: 8,
    gameId: 'mythtag',
    playerCount: 12,
    weekStart: oldestWeek,
  });
  seedRetentionCohort(events, {
    d1Retained: 9,
    d7Retained: 5,
    gameId: 'mythclash',
    playerCount: 10,
    weekStart: olderWeek,
  });

  await repo.seedRawEvents(events, 'integration_test');
  await rollingRefreshService.run();
  await retentionRefreshService.run();
};

describe('analytics app integration', () => {
  const now = new Date();
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  const analyticsConfig = readAnalyticsConfig({
    PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN: 'private-token',
    PLAYPULSE_DATABASE_URL: databaseUrl,
  });

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await seedAnalyticsFixture(prisma, now);
  });

  it('serves health responses', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.service).toBe('analytics');
    expect(response.body.request_id).toBeTruthy();
  });

  it('propagates sanitized request ids and exposes privacy-safe metrics', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const summaryResponse = await request(app)
      .get('/metrics/summary?game_id=mythclash')
      .set('X-Request-Id', 'analytics-smoke-1');
    const metricsResponse = await request(app).get('/metrics');

    expect(summaryResponse.status).toBe(200);
    expect(summaryResponse.headers['x-request-id']).toBe('analytics-smoke-1');
    expect(summaryResponse.body.request_id).toBe('analytics-smoke-1');
    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.headers['content-type']).toContain('text/plain');
    expect(metricsResponse.text).toContain(
      'analytics_requests_total{endpoint="/metrics/summary",status_class="2xx"} 1'
    );
    expect(metricsResponse.text).not.toContain('private-token');
    expect(metricsResponse.text).not.toContain('player_id_hash');
  });

  it('returns public summary metrics for a single title', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).get('/metrics/summary?game_id=mythclash');

    expect(response.status).toBe(200);
    expect(response.body.data.metrics.active_players).toEqual({
      suppressed: false,
      value: 12,
    });
    expect(response.body.data.metrics.matches_today).toEqual({
      suppressed: false,
      value: 11,
    });
    expect(response.body.data.metrics.avg_session_length_s).toEqual({
      suppressed: false,
      value: 1800,
    });
  });

  it('suppresses public all-game summary metrics when any title is suppressed', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).get('/metrics/summary?game_id=all');

    expect(response.status).toBe(200);
    expect(response.body.data.metrics.active_players).toEqual({
      suppressed: true,
      value: null,
    });
    expect(response.body.data.metrics.matches_today).toEqual({
      suppressed: true,
      value: null,
    });
    expect(response.body.data.metrics.avg_session_length_s).toEqual({
      suppressed: true,
      value: null,
    });
  });

  it('returns zero-filled single-game sessions daily points across 30 days', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const today = startOfUtcDay(now);
    const twoDaysAgo = addUtcDays(today, -2);

    const response = await request(app).get('/metrics/sessions/daily?game_id=mythclash&days=30');

    expect(response.status).toBe(200);
    expect(response.body.data.points).toHaveLength(30);
    expect(response.body.data.points.at(-1)).toEqual({
      active_players: 12,
      avg_session_length_s: 1800,
      metric_date: toDateKey(today),
      session_count: 12,
      suppressed: false,
    });
    expect(
      response.body.data.points.find((point: { metric_date: string }) => point.metric_date === toDateKey(twoDaysAgo))
    ).toEqual({
      active_players: 10,
      avg_session_length_s: 1500,
      metric_date: toDateKey(twoDaysAgo),
      session_count: 10,
      suppressed: false,
    });
    expect(
      response.body.data.points.find(
        (point: { metric_date: string }) => point.metric_date === toDateKey(addUtcDays(today, -1))
      )
    ).toEqual({
      active_players: 0,
      avg_session_length_s: 0,
      metric_date: toDateKey(addUtcDays(today, -1)),
      session_count: 0,
      suppressed: false,
    });
  });

  it('suppresses public all-game daily rows when any contributing title is suppressed', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).get('/metrics/sessions/daily?game_id=all&days=7');

    expect(response.status).toBe(200);
    expect(response.body.data.points.at(-1)).toEqual({
      active_players: null,
      avg_session_length_s: null,
      metric_date: toDateKey(startOfUtcDay(now)),
      session_count: null,
      suppressed: true,
    });
  });

  it('returns sorted popularity rows and merges suppressed buckets into other', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).get('/metrics/characters/popularity?game_id=all&days=7');

    expect(response.status).toBe(200);
    expect(response.body.data.characters).toEqual([
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

  it('returns private retention cohorts for a single title with suppressed raw counts', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app)
      .get('/metrics/retention/cohorts?game_id=mythclash&weeks=4')
      .set('Authorization', 'Bearer private-token');

    expect(response.status).toBe(200);
    expect(response.body.data.cohorts[0]).toEqual({
      cohort_date: toDateKey(addUtcDays(startOfUtcWeek(startOfUtcDay(now)), -14)),
      cohort_size: 10,
      d1_retained: null,
      d1_retention_pct: 0.9,
      d1_suppressed: true,
      d7_retained: null,
      d7_retention_pct: 0.5,
      d7_suppressed: true,
    });
    expect(response.body.data.cohorts[1]).toEqual({
      cohort_date: toDateKey(addUtcDays(startOfUtcWeek(startOfUtcDay(now)), -21)),
      cohort_size: 8,
      d1_retained: null,
      d1_retention_pct: 0.875,
      d1_suppressed: true,
      d7_retained: null,
      d7_retention_pct: 0.375,
      d7_suppressed: true,
    });
  });

  it('aggregates private retention cohorts across all titles by signup week', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app)
      .get('/metrics/retention/cohorts?game_id=all&weeks=4')
      .set('Authorization', 'Bearer private-token');

    expect(response.status).toBe(200);
    expect(response.body.data.cohorts.find((cohort: { cohort_date: string }) => cohort.cohort_date === toDateKey(addUtcDays(startOfUtcWeek(startOfUtcDay(now)), -21)))).toEqual({
      cohort_date: toDateKey(addUtcDays(startOfUtcWeek(startOfUtcDay(now)), -21)),
      cohort_size: 20,
      d1_retained: 17,
      d1_retention_pct: 0.85,
      d1_suppressed: false,
      d7_retained: 11,
      d7_retention_pct: 0.55,
      d7_suppressed: false,
    });
  });

  it('rejects invalid analytics query params with validation_failed', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).get('/metrics/sessions/daily?days=9');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
  });

  it('rejects missing or invalid private retention auth', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const missingAuthResponse = await request(app).get('/metrics/retention/cohorts');
    const invalidAuthResponse = await request(app)
      .get('/metrics/retention/cohorts')
      .set('Authorization', 'Bearer wrong-token');

    expect(missingAuthResponse.status).toBe(401);
    expect(missingAuthResponse.body.error.code).toBe('unauthorized');
    expect(invalidAuthResponse.status).toBe(401);
    expect(invalidAuthResponse.body.error.code).toBe('unauthorized');
  });

  it('returns not_found for unknown routes', async () => {
    const app = createAnalyticsApp({
      config: analyticsConfig,
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).get('/metrics/unknown');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('not_found');
  });
});
