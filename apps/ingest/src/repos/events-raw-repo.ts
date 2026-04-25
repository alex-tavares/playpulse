import type { Prisma, PrismaClient } from '@prisma/client';
import type { TelemetryEvent } from '@playpulse/schemas';

interface EventRawWriter {
  eventRaw: {
    createMany: (args: {
      data: Prisma.EventRawCreateManyInput[];
      skipDuplicates: boolean;
    }) => Promise<{ count: number }>;
  };
}

export class EventsRawRepo {
  constructor(private readonly prisma: EventRawWriter | PrismaClient) {}

  async insertBatch(
    events: TelemetryEvent[],
    apiKeyId: string,
    receivedAt: Date,
    ingestSource = 'godot_sdk'
  ) {
    const result = await this.prisma.eventRaw.createMany({
      data: events.map((event) => ({
        apiKeyId,
        buildId: event.build_id,
        consentAnalytics: event.consent_analytics,
        eventId: event.event_id,
        eventName: event.event_name,
        gameId: event.game_id,
        gameVersion: event.game_version,
        ingestSource,
        locale: event.locale ?? null,
        occurredAt: new Date(event.occurred_at),
        platform: event.platform,
        playerIdHash: event.player_id_hash,
        propsJsonb: event.properties,
        receivedAt,
        schemaVersion: event.schema_version,
        sessionId: event.session_id,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }
}
