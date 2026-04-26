import { describe, expect, it } from 'vitest';

import {
  analyticsCharacterPopularityResponseSchema,
  analyticsRetentionCohortsResponseSchema,
  analyticsSessionsDailyResponseSchema,
  analyticsSummaryResponseSchema,
  characterSelectedEventSchema,
  customEventCountsResponseSchema,
  customEventNamesResponseSchema,
  customEventRecentResponseSchema,
  customEventSchema,
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

  it('accepts valid custom events with flat primitive properties', () => {
    const result = customEventSchema.safeParse({
      event_id: '3cf3d980-fd78-42f5-8f09-58f1af8c184d',
      event_name: 'level_end',
      schema_version: '1.1',
      occurred_at: '2025-09-20T19:05:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      locale: 'en-US',
      consent_analytics: true,
      properties: {
        completed: true,
        duration_s: 180,
        level_id: 'forest_01',
        rewards: ['coin', 'gem'],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects custom events that reuse reserved core event names', () => {
    const result = customEventSchema.safeParse({
      event_id: '3cf3d980-fd78-42f5-8f09-58f1af8c184d',
      event_name: 'session_start',
      schema_version: '1.1',
      occurred_at: '2025-09-20T19:05:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      consent_analytics: true,
      properties: {},
    });

    expect(result.success).toBe(false);
  });

  it('rejects custom event guardrail violations', () => {
    const base = {
      event_id: '3cf3d980-fd78-42f5-8f09-58f1af8c184d',
      event_name: 'level_end',
      schema_version: '1.1',
      occurred_at: '2025-09-20T19:05:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      consent_analytics: true,
    };

    const invalidPropertySets = [
      { nested: { level: 3 } },
      { nullable: null },
      { nested_array: [['a']] },
      { invalidKey: 'bad' },
      { email: 'player@example.com' },
      Object.fromEntries(Array.from({ length: 26 }, (_, index) => [`key_${index}`, index])),
      { big: 'x'.repeat(1600) },
    ];

    for (const properties of invalidPropertySets) {
      expect(customEventSchema.safeParse({ ...base, properties }).success).toBe(false);
    }
  });

  it('rejects identifier, auth, contact, and free-text custom property keys', () => {
    const base = {
      event_id: '3cf3d980-fd78-42f5-8f09-58f1af8c184d',
      event_name: 'level_end',
      schema_version: '1.1',
      occurred_at: '2025-09-20T19:05:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      consent_analytics: true,
    };
    const rejectedKeys = [
      'account_id',
      'api_key',
      'auth_token',
      'chat_text',
      'device_id',
      'email_address',
      'error_message',
      'player_id',
      'player_id_hash',
      'player_name',
      'session_id',
      'user_external_id',
    ];

    for (const key of rejectedKeys) {
      expect(customEventSchema.safeParse({ ...base, properties: { [key]: 'unsafe' } }).success).toBe(false);
    }
  });

  it('rejects unsafe custom string values', () => {
    const base = {
      event_id: '3cf3d980-fd78-42f5-8f09-58f1af8c184d',
      event_name: 'level_end',
      schema_version: '1.1',
      occurred_at: '2025-09-20T19:05:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      consent_analytics: true,
    };
    const unsafeValues = [
      'player@example.com',
      'Bearer abcdef123456',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature',
      'x'.repeat(129),
    ];

    for (const value of unsafeValues) {
      expect(customEventSchema.safeParse({ ...base, properties: { level_id: value } }).success).toBe(false);
    }
  });

  it('accepts gameplay identifier custom property keys', () => {
    const result = customEventSchema.safeParse({
      event_id: '3cf3d980-fd78-42f5-8f09-58f1af8c184d',
      event_name: 'level_end',
      schema_version: '1.1',
      occurred_at: '2025-09-20T19:05:31Z',
      session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
      player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
      game_id: 'mythclash',
      game_version: '0.6.2',
      build_id: 'mc-2025.09.18',
      platform: 'pc',
      consent_analytics: true,
      properties: {
        build_id: 'mc-2025.09.18',
        character_id: 'warden',
        item_id: 'iron_sword',
        level_id: 'forest_01',
        loadout_id: 'starter',
        map_id: 'shrine_plaza',
        match_id: '2f9fe1c3-7d3a-4cb8-8bd8-1df54ad2a8a1',
        mode_id: 'ranked',
        quest_id: 'intro_path',
      },
    });

    expect(result.success).toBe(true);
  });

  it('accepts custom events in ingest batches', () => {
    const result = ingestEventsRequestSchema.safeParse({
      events: [
        {
          event_id: '3cf3d980-fd78-42f5-8f09-58f1af8c184d',
          event_name: 'item_crafted',
          schema_version: '1.1',
          occurred_at: '2025-09-20T19:05:31Z',
          session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
          player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
          game_id: 'mythclash',
          game_version: '0.6.2',
          build_id: 'mc-2025.09.18',
          platform: 'pc',
          consent_analytics: true,
          properties: {
            item_id: 'iron_sword',
            rarity_tier: 2,
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

  it('accepts valid schema_version syntax regardless of major version', () => {
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

    expect(result.success).toBe(true);
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

  it('accepts a valid analytics summary response', () => {
    const result = analyticsSummaryResponseSchema.safeParse({
      data: {
        game_id: 'all',
        last_updated: '2025-09-20T18:25:00Z',
        metrics: {
          active_players: {
            suppressed: false,
            value: 184,
          },
          avg_session_length_s: {
            suppressed: false,
            value: 1338,
          },
          matches_today: {
            suppressed: false,
            value: 92,
          },
        },
      },
      request_id: '01J8YX3TKYAF9V0P7WBH54M2RB',
    });

    expect(result.success).toBe(true);
  });

  it('accepts valid analytics sessions, popularity, and retention responses', () => {
    expect(
      analyticsSessionsDailyResponseSchema.safeParse({
        data: {
          days: 14,
          game_id: 'all',
          last_updated: '2025-09-20T18:25:00Z',
          points: [
            {
              active_players: 54,
              avg_session_length_s: 1275,
              metric_date: '2025-09-07',
              session_count: 86,
              suppressed: false,
            },
          ],
        },
        request_id: '01J8YX3TKYAF9V0P7WBH54M2RB',
      }).success
    ).toBe(true);

    expect(
      analyticsCharacterPopularityResponseSchema.safeParse({
        data: {
          characters: [
            {
              character_id: 'berserker',
              pick_count: 144,
              pick_ratio: 0.32,
              suppressed: false,
            },
          ],
          days: 7,
          game_id: 'all',
          last_updated: '2025-09-20T18:25:00Z',
        },
        request_id: '01J8YX3TKYAF9V0P7WBH54M2RB',
      }).success
    ).toBe(true);

    expect(
      analyticsRetentionCohortsResponseSchema.safeParse({
        data: {
          cohorts: [
            {
              cohort_date: '2025-08-04',
              cohort_size: 42,
              d1_retained: 19,
              d1_retention_pct: 0.45,
              d1_suppressed: false,
              d7_retained: null,
              d7_retention_pct: 0.21,
              d7_suppressed: true,
            },
          ],
          game_id: 'all',
          last_updated: '2025-09-20T18:25:00Z',
          weeks: 8,
        },
        request_id: '01J8YX3TKYAF9V0P7WBH54M2RB',
      }).success
    ).toBe(true);
  });

  it('accepts valid custom event debug responses', () => {
    expect(
      customEventNamesResponseSchema.safeParse({
        data: {
          days: 7,
          events: [
            {
              event_count: 12,
              event_name: 'level_end',
              first_seen: '2025-09-20T18:25:00Z',
              last_seen: '2025-09-20T19:25:00Z',
            },
          ],
          game_id: 'all',
          last_updated: '2025-09-20T19:25:00Z',
        },
        request_id: '01J8YX3TKYAF9V0P7WBH54M2RB',
      }).success
    ).toBe(true);

    expect(
      customEventCountsResponseSchema.safeParse({
        data: {
          days: 14,
          event_name: 'level_end',
          game_id: 'mythtag',
          last_updated: '2025-09-20T19:25:00Z',
          points: [
            {
              event_count: 3,
              metric_date: '2025-09-20',
            },
          ],
        },
        request_id: '01J8YX3TKYAF9V0P7WBH54M2RB',
      }).success
    ).toBe(true);

    expect(
      customEventRecentResponseSchema.safeParse({
        data: {
          event_name: 'level_end',
          events: [
            {
              build_id: 'mt-2025.09.19',
              consent_analytics: true,
              event_id: '3cf3d980-fd78-42f5-8f09-58f1af8c184d',
              event_name: 'level_end',
              game_id: 'mythtag',
              game_version: '0.3.0',
              locale: 'pt-BR',
              occurred_at: '2025-09-20T19:05:31Z',
              platform: 'pc',
              properties: {
                completed: true,
                duration_s: 180,
              },
              received_at: '2025-09-20T19:05:35Z',
              schema_version: '1.1',
            },
          ],
          game_id: 'mythtag',
          last_updated: '2025-09-20T19:25:00Z',
          limit: 25,
        },
        request_id: '01J8YX3TKYAF9V0P7WBH54M2RB',
      }).success
    ).toBe(true);
  });
});
