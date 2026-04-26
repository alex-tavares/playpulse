import {
  customEventPropertiesSchema,
  type AnalyticsQueryGameId,
  type CustomEventCountsResponse,
  type CustomEventNamesResponse,
  type CustomEventRecentResponse,
} from '@playpulse/schemas';

import { addUtcDays, startOfUtcDay, toDateKey } from '../lib/date';
import type {
  AnalyticsReadRepo,
  CustomEventNameRow,
  CustomEventRecentRow,
} from '../repos/analytics-read-repo';

const findLastUpdated = (
  rows: Array<{ lastRefreshedAt: Date }>,
  fallbackNow: () => Date
) =>
  (rows.length > 0
    ? rows.reduce(
        (latest, row) => (row.lastRefreshedAt > latest ? row.lastRefreshedAt : latest),
        rows[0]!.lastRefreshedAt
      )
    : fallbackNow()
  ).toISOString();

const findLastReceivedAt = (
  rows: Array<{ receivedAt: Date }>,
  fallbackNow: () => Date
) =>
  (rows.length > 0
    ? rows.reduce(
        (latest, row) => (row.receivedAt > latest ? row.receivedAt : latest),
        rows[0]!.receivedAt
      )
    : fallbackNow()
  ).toISOString();

const buildDateRange = (now: Date, days: number) => {
  const endDate = startOfUtcDay(now);
  const startDate = addUtcDays(endDate, -(days - 1));
  const dates: string[] = [];

  for (let offset = 0; offset < days; offset += 1) {
    dates.push(toDateKey(addUtcDays(startDate, offset)));
  }

  return {
    dates,
    endDateExclusive: addUtcDays(endDate, 1),
    startDate,
  };
};

const toSingleGameId = (gameId: AnalyticsQueryGameId) =>
  gameId === 'all' ? undefined : gameId;

export class CustomEventsDebugService {
  public constructor(
    private readonly repo: Pick<
      AnalyticsReadRepo,
      'getCustomEventCountRows' | 'getCustomEventNameRows' | 'getCustomEventRecentRows'
    >,
    private readonly now: () => Date = () => new Date()
  ) {}

  public async getCounts(
    gameId: AnalyticsQueryGameId,
    eventName: string,
    days: number
  ): Promise<CustomEventCountsResponse['data']> {
    const range = buildDateRange(this.now(), days);
    const rows = await this.repo.getCustomEventCountRows({
      endDate: range.endDateExclusive,
      eventName,
      gameId: toSingleGameId(gameId),
      startDate: range.startDate,
    });
    const rowsByDate = new Map(rows.map((row) => [toDateKey(row.metricDate), row]));

    return {
      days,
      event_name: eventName,
      game_id: gameId,
      last_updated: findLastUpdated(rows, this.now),
      points: range.dates.map((dateKey) => ({
        event_count: rowsByDate.get(dateKey)?.eventCount ?? 0,
        metric_date: dateKey,
      })),
    };
  }

  public async getNames(
    gameId: AnalyticsQueryGameId,
    days: number
  ): Promise<CustomEventNamesResponse['data']> {
    const range = buildDateRange(this.now(), days);
    const rows = await this.repo.getCustomEventNameRows({
      endDate: range.endDateExclusive,
      gameId: toSingleGameId(gameId),
      startDate: range.startDate,
    });

    return {
      days,
      events: rows.map((row: CustomEventNameRow) => ({
        event_count: row.eventCount,
        event_name: row.eventName,
        first_seen: row.firstSeen.toISOString(),
        last_seen: row.lastSeen.toISOString(),
      })),
      game_id: gameId,
      last_updated: findLastUpdated(rows, this.now),
    };
  }

  public async getRecent(
    gameId: AnalyticsQueryGameId,
    eventName: string,
    limit: number
  ): Promise<CustomEventRecentResponse['data']> {
    const rows = await this.repo.getCustomEventRecentRows({
      eventName,
      gameId: toSingleGameId(gameId),
      limit,
    });

    return {
      event_name: eventName,
      events: rows.map((row: CustomEventRecentRow) => ({
        build_id: row.buildId,
        consent_analytics: row.consentAnalytics,
        event_id: row.eventId,
        event_name: row.eventName,
        game_id: row.gameId,
        game_version: row.gameVersion,
        locale: row.locale,
        occurred_at: row.occurredAt.toISOString(),
        platform: row.platform,
        properties: customEventPropertiesSchema.parse(row.propsJsonb),
        received_at: row.receivedAt.toISOString(),
        schema_version: row.schemaVersion as '1.1',
      })),
      game_id: gameId,
      last_updated: findLastReceivedAt(rows, this.now),
      limit,
    };
  }
}
