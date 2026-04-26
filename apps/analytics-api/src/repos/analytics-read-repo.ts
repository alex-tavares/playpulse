import { PrismaClient } from '@prisma/client';

export interface CustomEventCountRow {
  eventCount: number;
  lastRefreshedAt: Date;
  metricDate: Date;
}

export interface CustomEventNameRow {
  eventCount: number;
  eventName: string;
  firstSeen: Date;
  lastRefreshedAt: Date;
  lastSeen: Date;
}

export interface CustomEventRecentRow {
  buildId: string;
  consentAnalytics: boolean;
  eventId: string;
  eventName: string;
  gameId: 'mythclash' | 'mythtag';
  gameVersion: string;
  locale: string | null;
  occurredAt: Date;
  platform: 'pc' | 'mac' | 'linux';
  propsJsonb: unknown;
  receivedAt: Date;
  schemaVersion: string;
}

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

export interface RetentionCohortRow {
  cohortDate: Date;
  cohortSize: number;
  d1Retained: number;
  d1RetentionPct: number;
  d1Suppressed: boolean;
  d7Retained: number;
  d7RetentionPct: number;
  d7Suppressed: boolean;
  gameId: string;
  lastRefreshedAt: Date;
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

export class AnalyticsReadRepo {
  public constructor(private readonly prisma: PrismaClient) {}

  public async getCustomEventCountRows(params: {
    endDate: Date;
    eventName: string;
    gameId?: 'mythclash' | 'mythtag';
    startDate: Date;
  }) {
    const gameId = params.gameId ?? null;

    return this.prisma.$queryRaw<CustomEventCountRow[]>`
      SELECT
        COUNT(*)::INTEGER AS "eventCount",
        MAX("received_at") AS "lastRefreshedAt",
        DATE("occurred_at") AS "metricDate"
      FROM "events_raw"
      WHERE "occurred_at" >= ${params.startDate}
        AND "occurred_at" < ${params.endDate}
        AND "consent_analytics" = TRUE
        AND "event_name" = ${params.eventName}
        AND "schema_version" = '1.1'
        AND (${gameId}::TEXT IS NULL OR "game_id" = ${gameId})
      GROUP BY DATE("occurred_at")
      ORDER BY "metricDate" ASC
    `;
  }

  public async getCustomEventNameRows(params: {
    endDate: Date;
    gameId?: 'mythclash' | 'mythtag';
    startDate: Date;
  }) {
    const gameId = params.gameId ?? null;

    return this.prisma.$queryRaw<CustomEventNameRow[]>`
      SELECT
        COUNT(*)::INTEGER AS "eventCount",
        "event_name" AS "eventName",
        MIN("occurred_at") AS "firstSeen",
        MAX("received_at") AS "lastRefreshedAt",
        MAX("occurred_at") AS "lastSeen"
      FROM "events_raw"
      WHERE "occurred_at" >= ${params.startDate}
        AND "occurred_at" < ${params.endDate}
        AND "consent_analytics" = TRUE
        AND "schema_version" = '1.1'
        AND "event_name" NOT IN (
          'session_start',
          'session_end',
          'match_start',
          'match_end',
          'character_selected'
        )
        AND (${gameId}::TEXT IS NULL OR "game_id" = ${gameId})
      GROUP BY "event_name"
      ORDER BY "eventCount" DESC, "eventName" ASC
    `;
  }

  public async getCustomEventRecentRows(params: {
    eventName: string;
    gameId?: 'mythclash' | 'mythtag';
    limit: number;
  }) {
    const gameId = params.gameId ?? null;

    return this.prisma.$queryRaw<CustomEventRecentRow[]>`
      SELECT
        "build_id" AS "buildId",
        "consent_analytics" AS "consentAnalytics",
        "event_id" AS "eventId",
        "event_name" AS "eventName",
        "game_id" AS "gameId",
        "game_version" AS "gameVersion",
        "locale",
        "occurred_at" AS "occurredAt",
        "platform",
        "props_jsonb" AS "propsJsonb",
        "received_at" AS "receivedAt",
        "schema_version" AS "schemaVersion"
      FROM "events_raw"
      WHERE "consent_analytics" = TRUE
        AND "event_name" = ${params.eventName}
        AND "schema_version" = '1.1'
        AND (${gameId}::TEXT IS NULL OR "game_id" = ${gameId})
      ORDER BY "occurred_at" DESC, "event_id" ASC
      LIMIT ${params.limit}
    `;
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

  public async getMetricsSummaryRows(gameId?: 'mythclash' | 'mythtag') {
    const requestedGameId = gameId ?? null;

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
      WHERE (${requestedGameId}::TEXT IS NULL OR "game_id" = ${requestedGameId})
      ORDER BY "game_id" ASC
    `;
  }

  public async getRetentionCohortRows(params: {
    endDate: Date;
    gameId?: 'mythclash' | 'mythtag';
    startDate: Date;
  }) {
    return this.prisma.retentionCohort.findMany({
      orderBy: [
        {
          cohortDate: 'asc',
        },
        {
          gameId: 'asc',
        },
      ],
      where: {
        cohortDate: {
          gte: params.startDate,
          lte: params.endDate,
        },
        ...(params.gameId
          ? {
              gameId: params.gameId,
            }
          : {}),
      },
    }) as Promise<RetentionCohortRow[]>;
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
}
