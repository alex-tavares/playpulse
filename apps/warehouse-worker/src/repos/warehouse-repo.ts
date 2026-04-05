import { PrismaClient } from '@prisma/client';

import type { DemoSeedEvent } from '../lib/demo-data';
import { mapEventToRawInput } from '../lib/raw-event-input';
import type { DerivedRetentionCohort, SessionStartFact } from '../lib/retention';

const createUtcDate = (dateKey: string) => new Date(`${dateKey}T00:00:00.000Z`);

const refreshableViews = new Set([
  'mv_sessions_daily',
  'mv_character_popularity',
  'mv_metrics_summary_current',
] as const);

const insertChunkSize = 500;

type RefreshableViewName =
  | 'mv_sessions_daily'
  | 'mv_character_popularity'
  | 'mv_metrics_summary_current';

export interface CharacterPopularityRow {
  characterId: string;
  gameId: string;
  lastRefreshedAt: Date;
  metricDate: Date;
  pickCount: number;
  pickRatio: number;
  suppressed: boolean;
}

export interface MetricsSummaryRow {
  activePlayers24h: number;
  avgSessionLengthS24h: number;
  gameId: string;
  lastRefreshedAt: Date;
  matchesToday: number;
  suppressedActivePlayers: boolean;
  suppressedAvgSessionLength: boolean;
  suppressedMatchesToday: boolean;
}

export interface SessionsDailyRow {
  activePlayers: number;
  avgSessionLengthS: number;
  gameId: string;
  lastRefreshedAt: Date;
  metricDate: Date;
  sessionCount: number;
  suppressed: boolean;
}

export class WarehouseRepo {
  public constructor(private readonly prisma: PrismaClient) {}

  public async countDimDates() {
    return this.prisma.dimDate.count();
  }

  public async countEventRawByGame(gameId: 'mythclash' | 'mythtag') {
    return this.prisma.eventRaw.count({
      where: {
        gameId,
      },
    });
  }

  public async getCharacterPopularityRows(params: {
    endDate: string;
    gameId?: 'mythclash' | 'mythtag';
    startDate: string;
  }) {
    const gameId = params.gameId ?? null;

    return this.prisma.$queryRaw<CharacterPopularityRow[]>`
      SELECT
        "character_id" AS "characterId",
        "game_id" AS "gameId",
        "last_refreshed_at" AS "lastRefreshedAt",
        "metric_date" AS "metricDate",
        "pick_count" AS "pickCount",
        "pick_ratio" AS "pickRatio",
        "suppressed"
      FROM "mv_character_popularity"
      WHERE "metric_date" BETWEEN ${params.startDate}::DATE AND ${params.endDate}::DATE
        AND (${gameId}::TEXT IS NULL OR "game_id" = ${gameId})
      ORDER BY "metric_date" ASC, "game_id" ASC, "pick_count" DESC, "character_id" ASC
    `;
  }

  public async getMetricsSummaryRows() {
    return this.prisma.$queryRaw<MetricsSummaryRow[]>`
      SELECT
        "active_players_24h" AS "activePlayers24h",
        "avg_session_length_s_24h" AS "avgSessionLengthS24h",
        "game_id" AS "gameId",
        "last_refreshed_at" AS "lastRefreshedAt",
        "matches_today" AS "matchesToday",
        "suppressed_active_players" AS "suppressedActivePlayers",
        "suppressed_avg_session_length" AS "suppressedAvgSessionLength",
        "suppressed_matches_today" AS "suppressedMatchesToday"
      FROM "mv_metrics_summary_current"
      ORDER BY "game_id" ASC
    `;
  }

  public async getRetentionCohorts() {
    return this.prisma.retentionCohort.findMany({
      orderBy: [
        {
          cohortDate: 'asc',
        },
        {
          gameId: 'asc',
        },
      ],
    });
  }

  public async getSessionsDailyRows(params: {
    endDate: string;
    gameId?: 'mythclash' | 'mythtag';
    startDate: string;
  }) {
    const gameId = params.gameId ?? null;

    return this.prisma.$queryRaw<SessionsDailyRow[]>`
      SELECT
        "active_players" AS "activePlayers",
        "avg_session_length_s" AS "avgSessionLengthS",
        "game_id" AS "gameId",
        "last_refreshed_at" AS "lastRefreshedAt",
        "metric_date" AS "metricDate",
        "session_count" AS "sessionCount",
        "suppressed"
      FROM "mv_sessions_daily"
      WHERE "metric_date" BETWEEN ${params.startDate}::DATE AND ${params.endDate}::DATE
        AND (${gameId}::TEXT IS NULL OR "game_id" = ${gameId})
      ORDER BY "metric_date" ASC, "game_id" ASC
    `;
  }

  public async listRetentionSessionStarts(): Promise<SessionStartFact[]> {
    const rows = await this.prisma.eventRaw.findMany({
      orderBy: [
        {
          occurredAt: 'asc',
        },
        {
          gameId: 'asc',
        },
      ],
      select: {
        gameId: true,
        occurredAt: true,
        playerIdHash: true,
      },
      where: {
        consentAnalytics: true,
        eventName: 'session_start',
      },
    });

    return rows.map((row) => ({
      gameId: row.gameId,
      occurredAt: row.occurredAt,
      playerIdHash: row.playerIdHash,
    }));
  }

  public async refreshMaterializedView(viewName: RefreshableViewName) {
    if (!refreshableViews.has(viewName)) {
      throw new Error(`Unsupported materialized view: ${viewName}`);
    }

    await this.prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW "${viewName}"`);
  }

  public async replaceRetentionCohorts(cohorts: DerivedRetentionCohort[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.retentionCohort.deleteMany();

      if (cohorts.length === 0) {
        return;
      }

      await tx.retentionCohort.createMany({
        data: cohorts.map((cohort) => ({
          cohortDate: cohort.cohortDate,
          cohortSize: cohort.cohortSize,
          d1Retained: cohort.d1Retained,
          d1RetentionPct: cohort.d1RetentionPct,
          d1Suppressed: cohort.d1Suppressed,
          d7Retained: cohort.d7Retained,
          d7RetentionPct: cohort.d7RetentionPct,
          d7Suppressed: cohort.d7Suppressed,
          gameId: cohort.gameId,
          lastRefreshedAt: cohort.lastRefreshedAt,
        })),
      });
    });
  }

  public async resetDemoSeedData() {
    await this.prisma.$transaction(async (tx) => {
      await tx.retentionCohort.deleteMany();
      await tx.eventRaw.deleteMany();
    });
  }

  public async seedRawEvents(events: DemoSeedEvent[], ingestSource = 'demo_seed') {
    let insertedCount = 0;

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < events.length; index += insertChunkSize) {
        const chunk = events
          .slice(index, index + insertChunkSize)
          .map(({ apiKeyId, event }) => mapEventToRawInput(event, apiKeyId, ingestSource));

        if (chunk.length === 0) {
          continue;
        }

        const result = await tx.eventRaw.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        insertedCount += result.count;
      }
    });

    return insertedCount;
  }

  public async upsertDimDates(dateKeys: string[]) {
    if (dateKeys.length === 0) {
      return 0;
    }

    const result = await this.prisma.dimDate.createMany({
      data: dateKeys.map((dateKey) => ({
        calendarDate: createUtcDate(dateKey),
      })),
      skipDuplicates: true,
    });

    return result.count;
  }
}
