import type { Prisma } from '@prisma/client';
import type { TelemetryEvent } from '@playpulse/schemas';

export const mapEventToRawInput = (
  event: TelemetryEvent,
  apiKeyId: string,
  ingestSource: string
): Prisma.EventRawCreateManyInput => ({
  apiKeyId,
  buildId: event.build_id,
  consentAnalytics: event.consent_analytics,
  eventId: event.event_id,
  eventName: event.event_name,
  gameId: event.game_id,
  gameVersion: event.game_version,
  ingestSource,
  insertedAt: new Date(event.occurred_at),
  locale: event.locale ?? null,
  occurredAt: new Date(event.occurred_at),
  platform: event.platform,
  playerIdHash: event.player_id_hash,
  propsJsonb: event.properties,
  receivedAt: new Date(event.occurred_at),
  schemaVersion: event.schema_version,
  sessionId: event.session_id,
});
