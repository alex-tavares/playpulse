import { ingestEventsRequestSchema, type IngestEventsRequest } from '@playpulse/schemas';

import { HttpError } from '../lib/http-error';
import { findUnsupportedSchemaVersion } from '../lib/schema-version';
import { EventsRawRepo } from '../repos/events-raw-repo';

const formatValidationDetails = (issues: Array<{ message: string; path: (string | number)[] }>) =>
  issues.map((issue) => ({
    message: issue.message,
    path: issue.path.join('.'),
  }));

export class EventIngestService {
  constructor(
    private readonly eventsRawRepo: EventsRawRepo,
    private readonly now: () => Date
  ) {}

  async ingest(payload: unknown, apiKeyId: string) {
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

    const receivedAt = this.now();
    const acceptedCount = await this.eventsRawRepo.insertBatch(parsed.data.events, apiKeyId, receivedAt);

    return {
      acceptedCount,
      payload: parsed.data,
      receivedAt,
    };
  }
}

export type ParsedIngestRequest = IngestEventsRequest;
