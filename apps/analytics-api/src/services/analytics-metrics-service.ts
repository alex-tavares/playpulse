import type {
  AnalyticsCharacterPopularityResponse,
  AnalyticsQueryGameId,
  AnalyticsRetentionCohortsResponse,
  AnalyticsSessionsDailyResponse,
  AnalyticsSummaryResponse,
} from '@playpulse/schemas';

import { addUtcDays, roundRatio, startOfUtcDay, startOfUtcWeek, toDateKey } from '../lib/date';
import type {
  AnalyticsReadRepo,
  CharacterPopularityRow,
  MetricsSummaryRow,
  RetentionCohortRow,
  SessionsDailyRow,
} from '../repos/analytics-read-repo';

export type AnalyticsVisibility = 'private' | 'public';

const findLastUpdated = (
  rows: Array<{ lastRefreshedAt: Date }>,
  fallbackNow: () => Date
) =>
  (rows.length > 0
    ? rows.reduce((earliest, row) =>
        row.lastRefreshedAt < earliest ? row.lastRefreshedAt : earliest, rows[0]!.lastRefreshedAt)
    : fallbackNow()
  ).toISOString();

const buildDateRange = (endDate: Date, days: number) => {
  const normalizedEndDate = startOfUtcDay(endDate);
  const startDate = addUtcDays(normalizedEndDate, -(days - 1));
  const dates: string[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    dates.push(toDateKey(addUtcDays(startDate, offset)));
  }

  return {
    dates,
    endDate: normalizedEndDate,
    startDate,
  };
};

export const formatSummaryMetrics = (
  rows: MetricsSummaryRow[],
  gameId: AnalyticsQueryGameId,
  visibility: AnalyticsVisibility,
  now: () => Date
): AnalyticsSummaryResponse['data'] => {
  const activePlayersSuppressed = visibility === 'public' && rows.some((row) => row.suppressedActivePlayers);
  const matchesSuppressed = visibility === 'public' && rows.some((row) => row.suppressedMatchesToday);
  const avgSessionSuppressed =
    visibility === 'public' && rows.some((row) => row.suppressedAvgSessionLength);

  return {
    game_id: gameId,
    last_updated: findLastUpdated(rows, now),
    metrics: {
      active_players: {
        suppressed: activePlayersSuppressed,
        value: activePlayersSuppressed
          ? null
          : rows.reduce((sum, row) => sum + row.activePlayers24h, 0),
      },
      avg_session_length_s: {
        suppressed: avgSessionSuppressed,
        value: avgSessionSuppressed
          ? null
          : rows.reduce((sum, row) => sum + row.avgSessionLengthS24h, 0),
      },
      matches_today: {
        suppressed: matchesSuppressed,
        value: matchesSuppressed ? null : rows.reduce((sum, row) => sum + row.matchesToday, 0),
      },
    },
  };
};

export const formatSessionsDailyPoints = (
  rows: SessionsDailyRow[],
  gameId: AnalyticsQueryGameId,
  days: 7 | 14 | 30,
  visibility: AnalyticsVisibility,
  now: () => Date
): AnalyticsSessionsDailyResponse['data'] => {
  const range = buildDateRange(now(), days);
  const rowGroups = new Map<string, SessionsDailyRow[]>();

  for (const row of rows) {
    const dateKey = toDateKey(row.metricDate);
    const group = rowGroups.get(dateKey) ?? [];
    group.push(row);
    rowGroups.set(dateKey, group);
  }

  return {
    days,
    game_id: gameId,
    last_updated: findLastUpdated(rows, now),
    points: range.dates.map((dateKey) => {
      const groupedRows = rowGroups.get(dateKey) ?? [];
      const suppressed = visibility === 'public' && groupedRows.some((row) => row.suppressed);
      const sessionCount = groupedRows.reduce((sum, row) => sum + row.sessionCount, 0);
      const activePlayers = groupedRows.reduce((sum, row) => sum + row.activePlayers, 0);
      const avgSessionLength = groupedRows.reduce((sum, row) => sum + row.avgSessionLengthS, 0);

      return {
        active_players: suppressed ? null : activePlayers,
        avg_session_length_s: suppressed ? null : avgSessionLength,
        metric_date: dateKey,
        session_count: suppressed ? null : sessionCount,
        suppressed,
      };
    }),
  };
};

export const formatCharacterPopularity = (
  rows: CharacterPopularityRow[],
  gameId: AnalyticsQueryGameId,
  days: 7 | 14,
  visibility: AnalyticsVisibility,
  now: () => Date
): AnalyticsCharacterPopularityResponse['data'] => {
  const totalPickCount = rows.reduce((sum, row) => sum + row.pickCount, 0);
  const visibleCharacterCounts = new Map<string, number>();
  let suppressedPickCount = 0;

  for (const row of rows) {
    if (visibility === 'public' && row.suppressed) {
      suppressedPickCount += row.pickCount;
      continue;
    }

    visibleCharacterCounts.set(
      row.characterId,
      (visibleCharacterCounts.get(row.characterId) ?? 0) + row.pickCount
    );
  }

  const characters: AnalyticsCharacterPopularityResponse['data']['characters'] = [...visibleCharacterCounts.entries()]
    .map(([characterId, pickCount]) => ({
      character_id: characterId,
      pick_count: pickCount,
      pick_ratio: roundRatio(pickCount, totalPickCount),
      suppressed: false,
    }))
    .sort((left, right) => right.pick_count - left.pick_count || left.character_id.localeCompare(right.character_id));

  if (visibility === 'public' && suppressedPickCount > 0) {
    characters.push({
      character_id: 'other',
      pick_count: null,
      pick_ratio: roundRatio(suppressedPickCount, totalPickCount),
      suppressed: true,
    });
  }

  return {
    characters,
    days,
    game_id: gameId,
    last_updated: findLastUpdated(rows, now),
  };
};

export const formatWeeklyRetentionCohorts = (
  rows: RetentionCohortRow[],
  gameId: AnalyticsQueryGameId,
  weeks: number,
  now: () => Date
): AnalyticsRetentionCohortsResponse['data'] => {
  const endWeek = startOfUtcWeek(now());
  const startWeek = addUtcDays(endWeek, -(weeks - 1) * 7);
  const groupedRows = new Map<
    string,
    {
      cohortDate: Date;
      cohortSize: number;
      d1Retained: number;
      d7Retained: number;
    }
  >();

  for (const row of rows) {
    const weekStart = startOfUtcWeek(row.cohortDate);
    if (weekStart < startWeek || weekStart > endWeek) {
      continue;
    }

    const weekKey = toDateKey(weekStart);
    const group = groupedRows.get(weekKey) ?? {
      cohortDate: weekStart,
      cohortSize: 0,
      d1Retained: 0,
      d7Retained: 0,
    };

    group.cohortSize += row.cohortSize;
    group.d1Retained += row.d1Retained;
    group.d7Retained += row.d7Retained;
    groupedRows.set(weekKey, group);
  }

  const cohorts = [...groupedRows.values()]
    .sort((left, right) => right.cohortDate.getTime() - left.cohortDate.getTime())
    .slice(0, weeks)
    .map((group) => {
      const d1Suppressed = group.d1Retained > 0 && group.d1Retained < 10;
      const d7Suppressed = group.d7Retained > 0 && group.d7Retained < 10;

      return {
        cohort_date: toDateKey(group.cohortDate),
        cohort_size: group.cohortSize,
        d1_retained: d1Suppressed ? null : group.d1Retained,
        d1_retention_pct: roundRatio(group.d1Retained, group.cohortSize),
        d1_suppressed: d1Suppressed,
        d7_retained: d7Suppressed ? null : group.d7Retained,
        d7_retention_pct: roundRatio(group.d7Retained, group.cohortSize),
        d7_suppressed: d7Suppressed,
      };
    });

  return {
    cohorts,
    game_id: gameId,
    last_updated: findLastUpdated(rows, now),
    weeks,
  };
};

export class AnalyticsMetricsService {
  public constructor(
    private readonly repo: Pick<
      AnalyticsReadRepo,
      | 'getCharacterPopularityRows'
      | 'getMetricsSummaryRows'
      | 'getRetentionCohortRows'
      | 'getSessionsDailyRows'
    >,
    private readonly now: () => Date = () => new Date()
  ) {}

  public async getCharacterPopularity(
    gameId: AnalyticsQueryGameId,
    days: 7 | 14,
    visibility: AnalyticsVisibility
  ) {
    const range = buildDateRange(this.now(), days);
    const rows = await this.repo.getCharacterPopularityRows({
      endDate: toDateKey(range.endDate),
      gameId: gameId === 'all' ? undefined : gameId,
      startDate: toDateKey(range.startDate),
    });

    return formatCharacterPopularity(rows, gameId, days, visibility, this.now);
  }

  public async getRetentionCohorts(gameId: AnalyticsQueryGameId, weeks: number) {
    const endDate = this.now();
    const endWeek = startOfUtcWeek(endDate);
    const startWeek = addUtcDays(endWeek, -(weeks - 1) * 7);
    const rows = await this.repo.getRetentionCohortRows({
      endDate,
      gameId: gameId === 'all' ? undefined : gameId,
      startDate: startWeek,
    });

    return formatWeeklyRetentionCohorts(rows, gameId, weeks, this.now);
  }

  public async getSessionsDaily(
    gameId: AnalyticsQueryGameId,
    days: 7 | 14 | 30,
    visibility: AnalyticsVisibility
  ) {
    const range = buildDateRange(this.now(), days);
    const rows = await this.repo.getSessionsDailyRows({
      endDate: toDateKey(range.endDate),
      gameId: gameId === 'all' ? undefined : gameId,
      startDate: toDateKey(range.startDate),
    });

    return formatSessionsDailyPoints(rows, gameId, days, visibility, this.now);
  }

  public async getSummary(gameId: AnalyticsQueryGameId, visibility: AnalyticsVisibility) {
    const rows = await this.repo.getMetricsSummaryRows(gameId === 'all' ? undefined : gameId);
    return formatSummaryMetrics(rows, gameId, visibility, this.now);
  }
}
