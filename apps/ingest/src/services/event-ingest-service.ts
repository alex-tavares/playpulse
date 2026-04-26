import {
  ingestEventsRequestSchema,
  isCustomEventName,
  type IngestEventsRequest,
} from '@playpulse/schemas';

import { HttpError } from '../lib/http-error';
import { findUnsupportedSchemaVersion } from '../lib/schema-version';
import { EventsRawRepo } from '../repos/events-raw-repo';

const formatValidationDetails = (issues: Array<{ message: string; path: (string | number)[] }>) =>
  issues.map((issue) => ({
    message: issue.message,
    path: issue.path.join('.'),
  }));

export const countCustomEventCandidates = (payload: unknown) => {
  if (typeof payload !== 'object' || payload === null || !('events' in payload)) {
    return 0;
  }

  const events = (payload as { events?: unknown }).events;
  if (!Array.isArray(events)) {
    return 0;
  }

  return events.filter((event) => {
    if (typeof event !== 'object' || event === null || !('event_name' in event)) {
      return false;
    }

    const eventName = (event as { event_name?: unknown }).event_name;
    return typeof eventName === 'string' && isCustomEventName(eventName);
  }).length;
};

export class EventIngestService {
  constructor(
    private readonly eventsRawRepo: EventsRawRepo,
    private readonly now: () => Date
  ) {}

  async ingest(payload: unknown, apiKeyId: string, expectedGameId?: 'mythclash' | 'mythtag') {
    const unsupportedSchemaVersion = findUnsupportedSchemaVersion(payload);
    if (unsupportedSchemaVersion) {
      throw new HttpError(
        400,
        'unsupported_schema_version',
        `Unsupported schema version ${unsupportedSchemaVersion}`
      );
    }

    const parsed = ingestEventsRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new HttpError(400, 'validation_failed', 'Request body did not match the expected schema', {
        details: formatValidationDetails(parsed.error.issues),
      });
    }

    if (expectedGameId && parsed.data.events.some((event) => event.game_id !== expectedGameId)) {
      throw new HttpError(401, 'unauthorized', 'Credential is not allowed for event game_id');
    }

    const receivedAt = this.now();
    const acceptedCount = await this.eventsRawRepo.insertBatch(parsed.data.events, apiKeyId, receivedAt);
    const customEventCount = countCustomEventCandidates(parsed.data);

    return {
      acceptedCount,
      customEventCount,
      payload: parsed.data,
      receivedAt,
    };
  }
}

export type ParsedIngestRequest = IngestEventsRequest;
