import { describe, expect, it } from 'vitest';

import {
  characterSelectedEventSchema,
  ingestEventsRequestSchema,
  matchEndEventSchema,
  matchStartEventSchema,
  sessionEndEventSchema,
  sessionStartEventSchema,
} from '@playpulse/schemas';

import {
  createCharacterSelectedEvent,
  createDemoDatasetEvents,
  createIngestBatch,
  createMatchEndEvent,
  createMatchStartEvent,
  createSessionEndEvent,
  createSessionStartEvent,
} from './index';

describe('testkit', () => {
  it('creates valid MVP events', () => {
    expect(sessionStartEventSchema.safeParse(createSessionStartEvent()).success).toBe(true);
    expect(sessionEndEventSchema.safeParse(createSessionEndEvent()).success).toBe(true);
    expect(matchStartEventSchema.safeParse(createMatchStartEvent()).success).toBe(true);
    expect(matchEndEventSchema.safeParse(createMatchEndEvent()).success).toBe(true);
    expect(characterSelectedEventSchema.safeParse(createCharacterSelectedEvent()).success).toBe(
      true
    );
  });

  it('creates valid ingest batches', () => {
    expect(
      ingestEventsRequestSchema.safeParse(
        createIngestBatch([createSessionStartEvent(), createMatchEndEvent()])
      ).success
    ).toBe(true);
  });

  it('creates demo-oriented helpers with mixed titles and consent states', () => {
    const events = createDemoDatasetEvents();

    expect(events.length).toBeGreaterThan(5);
    expect(events.some((event) => event.game_id === 'mythclash')).toBe(true);
    expect(events.some((event) => event.game_id === 'mythtag')).toBe(true);
    expect(events.some((event) => event.consent_analytics === false)).toBe(true);
    expect(ingestEventsRequestSchema.safeParse(createIngestBatch(events.slice(0, 5))).success).toBe(
      true
    );
  });
});
