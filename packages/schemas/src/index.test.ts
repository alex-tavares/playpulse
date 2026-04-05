import { describe, expect, it } from 'vitest';

import {
  characterSelectedEventSchema,
  ingestEventsRequestSchema,
  matchEndEventSchema,
  sessionStartEventSchema,
} from './index';

describe('schemas', () => {
  it('accepts a valid session_start event', () => {
    const result = sessionStartEventSchema.safeParse({
      event_id: '7f4c9e4d-5f3c-4e51-9dc8-6e0a9f0c1234',
      event_name: 'session_start',
      schema_version: '1.0',
      occurred_at: '2025-09-20T18:22:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      locale: 'en-US',
      consent_analytics: true,
      properties: {
        launch_reason: 'fresh_launch',
        connection_mode: 'online',
        timezone_offset_min: -240,
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts a valid ingest batch', () => {
    const result = ingestEventsRequestSchema.safeParse({
      events: [
        {
          event_id: '1490f7d1-7772-4b51-a5f2-0e03ee9d83ce',
          event_name: 'match_end',
          schema_version: '1.0',
          occurred_at: '2025-09-20T18:47:05Z',
          session_id: 'ea0bc3d2-57f2-4da3-9881-431f2e2ad87f',
          player_id_hash: '5a0e37d47b83f85cf6335dcf28f17a99f61c85b9a3d2f26718a1f0fdc2cbd734',
          game_id: 'mythtag',
          game_version: '0.3.0',
          build_id: 'mt-2025.09.19',
          platform: 'pc',
          locale: 'pt-BR',
          consent_analytics: true,
          properties: {
            match_id: '2f9fe1c3-7d3a-4cb8-8bd8-1df54ad2a8a1',
            duration_s: 815,
            result: 'win',
            character_id: 'berserker',
            score: 3420,
            damage_dealt: 18750,
          },
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid enum values', () => {
    const result = sessionStartEventSchema.safeParse({
      event_id: '7f4c9e4d-5f3c-4e51-9dc8-6e0a9f0c1234',
      event_name: 'session_start',
      schema_version: '1.0',
      occurred_at: '2025-09-20T18:22:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      consent_analytics: true,
      properties: {
        launch_reason: 'startup',
        connection_mode: 'online',
        timezone_offset_min: -240,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects oversize arrays', () => {
    const result = characterSelectedEventSchema.safeParse({
      event_id: '58c06d48-d11b-4ab4-bf57-76f19855d85e',
      event_name: 'character_selected',
      schema_version: '1.0',
      occurred_at: '2025-09-20T18:28:15Z',
      session_id: 'ea0bc3d2-57f2-4da3-9881-431f2e2ad87f',
      player_id_hash: '5a0e37d47b83f85cf6335dcf28f17a99f61c85b9a3d2f26718a1f0fdc2cbd734',
      game_id: 'mythtag',
      game_version: '0.3.0',
      build_id: 'mt-2025.09.19',
      platform: 'pc',
      locale: 'pt-BR',
      consent_analytics: true,
      properties: {
        selection_context: 'match_lobby',
        character_id: 'berserker',
        perk_ids: ['a', 'b', 'c', 'd', 'e', 'f'],
        is_random: false,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects oversize strings', () => {
    const result = matchEndEventSchema.safeParse({
      event_id: '1490f7d1-7772-4b51-a5f2-0e03ee9d83ce',
      event_name: 'match_end',
      schema_version: '1.0',
      occurred_at: '2025-09-20T18:47:05Z',
      session_id: 'ea0bc3d2-57f2-4da3-9881-431f2e2ad87f',
      player_id_hash: '5a0e37d47b83f85cf6335dcf28f17a99f61c85b9a3d2f26718a1f0fdc2cbd734',
      game_id: 'mythtag',
      game_version: '0.3.0',
      build_id: 'mt-2025.09.19',
      platform: 'pc',
      locale: 'pt-BR',
      consent_analytics: true,
      properties: {
        match_id: '2f9fe1c3-7d3a-4cb8-8bd8-1df54ad2a8a1',
        duration_s: 815,
        result: 'win',
        character_id: 'x'.repeat(33),
        score: 3420,
        damage_dealt: 18750,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects invalid major schema versions', () => {
    const result = sessionStartEventSchema.safeParse({
      event_id: '7f4c9e4d-5f3c-4e51-9dc8-6e0a9f0c1234',
      event_name: 'session_start',
      schema_version: '2.0',
      occurred_at: '2025-09-20T18:22:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      consent_analytics: true,
      properties: {
        launch_reason: 'fresh_launch',
        connection_mode: 'online',
        timezone_offset_min: -240,
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects batches over 10 events', () => {
    const events = Array.from({ length: 11 }, (_, index) => ({
      event_id: `00000000-0000-4000-8000-${index.toString().padStart(12, '0')}`,
      event_name: 'session_start',
      schema_version: '1.0',
      occurred_at: '2025-09-20T18:22:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      consent_analytics: true,
      properties: {
        launch_reason: 'fresh_launch',
        connection_mode: 'online',
        timezone_offset_min: -240,
      },
    }));

    expect(ingestEventsRequestSchema.safeParse({ events }).success).toBe(false);
  });
});
