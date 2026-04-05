import type {
  CharacterSelectedEvent,
  IngestEventsRequest,
  MatchEndEvent,
  MatchStartEvent,
  SessionEndEvent,
  SessionStartEvent,
} from '@playpulse/schemas';

const sessionStartBase: SessionStartEvent = {
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
};

const sessionEndBase: SessionEndEvent = {
  event_id: '9af4ad3e-e71d-4a10-8ec4-0f65b0338d7c',
  event_name: 'session_end',
  schema_version: '1.0',
  occurred_at: '2025-09-20T18:57:31Z',
  session_id: 'bd1c2c1b-b9d3-4c0f-8b05-0cb089d3f3f9',
  player_id_hash: 'c4a1f1d5a6294eab2ce8bba1f5b5fd27a9b6e0fead4b7d2a1a8cce71d2e9c2b1',
  game_id: 'mythclash',
  game_version: '0.6.2',
  build_id: 'mc-2025.09.18',
  platform: 'pc',
  locale: 'en-US',
  consent_analytics: true,
  properties: {
    duration_s: 2100,
    exit_reason: 'user_exit',
    xp_earned: 320,
  },
};

const matchStartBase: MatchStartEvent = {
  event_id: 'd5f6e7ea-d775-4f64-9eaf-432f3dcb4a73',
  event_name: 'match_start',
  schema_version: '1.0',
  occurred_at: '2025-09-20T18:30:05Z',
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
    mode_id: 'arena_ranked',
    map_id: 'obsidian_gate',
    team_size: 3,
    party_size: 2,
    mmr_bucket: 'gold',
  },
};

const matchEndBase: MatchEndEvent = {
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
};

const characterSelectedBase: CharacterSelectedEvent = {
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
    loadout_id: 'starter_burst',
    perk_ids: ['quick_step', 'iron_will'],
    is_random: false,
  },
};

type EventOverride<T extends { properties: object }> = Partial<Omit<T, 'properties'>> & {
  properties?: Partial<T['properties']>;
};

const mergeEvent = <T extends { properties: object }>(
  base: T,
  overrides: EventOverride<T> = {}
): T => ({
  ...base,
  ...overrides,
  properties: {
    ...base.properties,
    ...overrides.properties,
  },
}) as T;

export const createSessionStartEvent = (overrides?: EventOverride<SessionStartEvent>) =>
  mergeEvent(sessionStartBase, overrides);

export const createSessionEndEvent = (overrides?: EventOverride<SessionEndEvent>) =>
  mergeEvent(sessionEndBase, overrides);

export const createMatchStartEvent = (overrides?: EventOverride<MatchStartEvent>) =>
  mergeEvent(matchStartBase, overrides);

export const createMatchEndEvent = (overrides?: EventOverride<MatchEndEvent>) =>
  mergeEvent(matchEndBase, overrides);

export const createCharacterSelectedEvent = (overrides?: EventOverride<CharacterSelectedEvent>) =>
  mergeEvent(characterSelectedBase, overrides);

export const createIngestBatch = (
  events: IngestEventsRequest['events'] = [createSessionStartEvent()]
): IngestEventsRequest => ({
  events,
});

export const createDemoDatasetEvents = () => [
  createSessionStartEvent(),
  createSessionEndEvent(),
  createMatchStartEvent(),
  createMatchEndEvent(),
  createCharacterSelectedEvent(),
  createSessionStartEvent({
    event_id: '6bb3e273-7ee0-4375-b8c0-5c1fa58bcc7d',
    game_id: 'mythtag',
    player_id_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    session_id: '8b59a1fc-7622-4733-8bd0-0dc77ec2dc53',
    locale: 'pt-BR',
    properties: {
      timezone_offset_min: -180,
    },
  }),
  createSessionEndEvent({
    event_id: '0c2e0f0c-3d74-4fb8-8a1d-60fdd7603819',
    game_id: 'mythtag',
    player_id_hash: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    session_id: '8b59a1fc-7622-4733-8bd0-0dc77ec2dc53',
    consent_analytics: false,
  }),
];
