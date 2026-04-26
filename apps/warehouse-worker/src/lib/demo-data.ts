import { createHash, randomUUID } from 'node:crypto';

import type { TelemetryEvent } from '@playpulse/schemas';
import {
  createCharacterSelectedEvent,
  createMatchEndEvent,
  createMatchStartEvent,
  createSessionEndEvent,
  createSessionStartEvent,
} from '@playpulse/testkit';

import { addUtcDays, startOfUtcDay } from './date-range';

interface DemoGameConfig {
  apiKeyId: string;
  buildId: string;
  characterOptions: string[];
  dailyPlayers: number[];
  gameId: 'mythclash' | 'mythtag';
  gameVersion: string;
  locale: string;
  rareCharacters: string[];
  weeklyCohortD1: number[];
  weeklyCohortD7: number[];
  weeklyCohortSizes: number[];
}

export interface DemoSeedEvent {
  apiKeyId: string;
  event: TelemetryEvent;
}

const demoConfigs: DemoGameConfig[] = [
  {
    apiKeyId: 'demo-mythclash',
    buildId: 'mc-2026.04.05',
    characterOptions: ['warden', 'oracle', 'berserker', 'sentinel', 'alchemist', 'ranger'],
    dailyPlayers: [48, 52, 60, 58, 42, 0, 55, 57, 62, 8, 50, 8, 53, 59],
    gameId: 'mythclash',
    gameVersion: '0.6.2',
    locale: 'en-US',
    rareCharacters: ['shade_monk'],
    weeklyCohortD1: [11, 12, 13, 11, 10, 9, 8, 6],
    weeklyCohortD7: [10, 11, 12, 10, 9, 8, 7, 4],
    weeklyCohortSizes: [14, 15, 16, 14, 13, 12, 11, 9],
  },
  {
    apiKeyId: 'demo-mythtag',
    buildId: 'mt-2026.04.05',
    characterOptions: ['berserker', 'duelist', 'seer', 'warden', 'mystic'],
    dailyPlayers: [32, 36, 40, 38, 28, 0, 35, 37, 42, 7, 34, 7, 36, 39],
    gameId: 'mythtag',
    gameVersion: '0.3.0',
    locale: 'pt-BR',
    rareCharacters: ['trickster'],
    weeklyCohortD1: [10, 11, 12, 10, 9, 8, 7, 5],
    weeklyCohortD7: [9, 10, 11, 9, 8, 7, 6, 3],
    weeklyCohortSizes: [12, 13, 14, 12, 11, 10, 10, 8],
  },
];

const createPlayerHash = (seed: string) =>
  createHash('sha256').update(seed, 'utf8').digest('hex');

const startOfUtcWeek = (value: Date) => {
  const result = startOfUtcDay(value);
  const dayOffset = (result.getUTCDay() + 6) % 7;
  return addUtcDays(result, -dayOffset);
};

const pickCharacter = (config: DemoGameConfig, dayOffset: number, playerIndex: number, pickIndex: number) => {
  if (playerIndex < 3 && dayOffset % 4 === 0 && pickIndex === 0) {
    return config.rareCharacters[playerIndex % config.rareCharacters.length]!;
  }

  return config.characterOptions[(playerIndex + dayOffset + pickIndex) % config.characterOptions.length]!;
};

const buildBaseOverrides = (
  config: DemoGameConfig,
  occurredAt: Date,
  playerSeed: string,
  sessionId: string,
  consentAnalytics: boolean
) => ({
  build_id: config.buildId,
  consent_analytics: consentAnalytics,
  game_id: config.gameId,
  game_version: config.gameVersion,
  locale: config.locale,
  occurred_at: occurredAt.toISOString(),
  platform: 'pc' as const,
  player_id_hash: createPlayerHash(playerSeed),
  session_id: sessionId,
});

const pushHistoricalBootstrapSessionStart = (
  output: DemoSeedEvent[],
  config: DemoGameConfig,
  occurredAt: Date,
  playerSeed: string
) => {
  output.push({
    apiKeyId: config.apiKeyId,
    event: createSessionStartEvent({
      ...buildBaseOverrides(config, occurredAt, playerSeed, randomUUID(), true),
      event_id: randomUUID(),
      properties: {
        connection_mode: 'online',
        launch_reason: 'fresh_launch',
        timezone_offset_min: config.gameId === 'mythtag' ? -180 : -240,
      },
    }),
  });
};

const pushSessionTriplet = (
  output: DemoSeedEvent[],
  config: DemoGameConfig,
  occurredAt: Date,
  playerSeed: string,
  sessionId: string,
  consentAnalytics: boolean,
  durationSeconds: number,
  dayOffset: number,
  playerIndex: number,
  includeMatch = true
) => {
  const endAt = occurredAt;
  const startAt = new Date(endAt.getTime() - durationSeconds * 1000);
  const baseStart = buildBaseOverrides(config, startAt, playerSeed, sessionId, consentAnalytics);
  const baseEnd = buildBaseOverrides(config, endAt, playerSeed, sessionId, consentAnalytics);

  output.push({
    apiKeyId: config.apiKeyId,
    event: createSessionStartEvent({
      ...baseStart,
      event_id: randomUUID(),
      properties: {
        connection_mode: 'online',
        launch_reason: dayOffset === 0 ? 'fresh_launch' : 'resume',
        timezone_offset_min: config.gameId === 'mythtag' ? -180 : -240,
      },
    }),
  });

  output.push({
    apiKeyId: config.apiKeyId,
    event: createSessionEndEvent({
      ...baseEnd,
      event_id: randomUUID(),
      properties: {
        duration_s: durationSeconds,
        exit_reason: 'user_exit',
        xp_earned: 80 + ((playerIndex + dayOffset) % 400),
      },
    }),
  });

  for (let pickIndex = 0; pickIndex < 2; pickIndex += 1) {
    const characterSelectedAt = new Date(startAt.getTime() + (pickIndex + 1) * 120_000);
    output.push({
      apiKeyId: config.apiKeyId,
      event: createCharacterSelectedEvent({
        ...buildBaseOverrides(
          config,
          characterSelectedAt,
          playerSeed,
          sessionId,
          consentAnalytics
        ),
        event_id: randomUUID(),
        properties: {
          character_id: pickCharacter(config, dayOffset, playerIndex, pickIndex),
          is_random: false,
          loadout_id: `loadout_${(playerIndex + pickIndex) % 4}`,
          perk_ids: ['quick_step', 'iron_will'],
          selection_context: 'match_lobby',
        },
      }),
    });
  }

  if (!includeMatch) {
    return;
  }

  const matchId = randomUUID();
  const matchStartAt = new Date(startAt.getTime() + 300_000);
  const matchDuration = Math.min(durationSeconds - 420, 300 + ((playerIndex + dayOffset) % 900));
  const matchEndAt = new Date(matchStartAt.getTime() + Math.max(matchDuration, 120) * 1000);

  output.push({
    apiKeyId: config.apiKeyId,
    event: createMatchStartEvent({
      ...buildBaseOverrides(config, matchStartAt, playerSeed, sessionId, consentAnalytics),
      event_id: randomUUID(),
      properties: {
        map_id: config.gameId === 'mythclash' ? 'mythic_keep' : 'obsidian_gate',
        match_id: matchId,
        mmr_bucket: playerIndex % 5 === 0 ? 'silver' : 'gold',
        mode_id: playerIndex % 4 === 0 ? 'casual' : 'arena_ranked',
        party_size: (playerIndex % 3) + 1,
        team_size: config.gameId === 'mythclash' ? 5 : 3,
      },
    }),
  });

  output.push({
    apiKeyId: config.apiKeyId,
    event: createMatchEndEvent({
      ...buildBaseOverrides(config, matchEndAt, playerSeed, sessionId, consentAnalytics),
      event_id: randomUUID(),
      properties: {
        character_id: pickCharacter(config, dayOffset, playerIndex, 0),
        damage_dealt: 6000 + ((playerIndex + dayOffset) % 20000),
        duration_s: Math.max(matchDuration, 120),
        match_id: matchId,
        result: playerIndex % 5 === 0 ? 'loss' : 'win',
        score: 1200 + ((playerIndex * 97 + dayOffset) % 4000),
      },
    }),
  });
};

export const generateDemoSeedEvents = (now: Date) => {
  const output: DemoSeedEvent[] = [];
  const today = startOfUtcDay(now);
  const currentWeek = startOfUtcWeek(today);

  for (const config of demoConfigs) {
    const activePoolSize = Math.max(...config.dailyPlayers);
    const bootstrapStartDate = addUtcDays(currentWeek, -84);
    const bootstrapDate = new Date(
      Date.UTC(
        bootstrapStartDate.getUTCFullYear(),
        bootstrapStartDate.getUTCMonth(),
        bootstrapStartDate.getUTCDate(),
        10,
        0,
        0
      )
    );

    for (let playerIndex = 0; playerIndex < activePoolSize; playerIndex += 1) {
      pushHistoricalBootstrapSessionStart(
        output,
        config,
        new Date(bootstrapDate.getTime() + playerIndex * 60_000),
        `active:${config.gameId}:${playerIndex}`
      );
    }

    config.dailyPlayers.forEach((playerCount, index) => {
      const dayOffset = config.dailyPlayers.length - 1 - index;
      const dayDate = addUtcDays(today, -dayOffset);

      for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
        const recentWindow = dayOffset === 0 && playerIndex >= Math.max(playerCount - 3, 0);
        const endAt = recentWindow
          ? new Date(now.getTime() - (playerCount - playerIndex) * 180_000)
          : new Date(
              Date.UTC(
                dayDate.getUTCFullYear(),
                dayDate.getUTCMonth(),
                dayDate.getUTCDate(),
                18,
                (playerIndex * 7) % 60,
                0
              )
            );
        const durationSeconds = 1200 + ((playerIndex + dayOffset * 17) % 2400);
        const playerSeed = `active:${config.gameId}:${playerIndex}`;
        const consentAnalytics =
          !(playerCount >= 24 && playerIndex % 12 === 0 && dayOffset % 3 === 0);

        pushSessionTriplet(
          output,
          config,
          endAt,
          playerSeed,
          randomUUID(),
          consentAnalytics,
          durationSeconds,
          dayOffset,
          playerIndex
        );
      }
    });

    config.weeklyCohortSizes.forEach((cohortSize, cohortIndex) => {
      const cohortDate = addUtcDays(
        currentWeek,
        -((config.weeklyCohortSizes.length - 1 - cohortIndex) * 7)
      );
      const d1Retained = config.weeklyCohortD1[cohortIndex] ?? 0;
      const d7Retained = config.weeklyCohortD7[cohortIndex] ?? 0;

      for (let playerIndex = 0; playerIndex < cohortSize; playerIndex += 1) {
        const baseSeed = `cohort:${config.gameId}:${cohortIndex}:${playerIndex}`;
        const sessionId = randomUUID();
        const baseEndAt = new Date(
          Date.UTC(
            cohortDate.getUTCFullYear(),
            cohortDate.getUTCMonth(),
            cohortDate.getUTCDate(),
            12,
            playerIndex % 60,
            0
          )
        );

        pushSessionTriplet(
          output,
          config,
          baseEndAt,
          baseSeed,
          sessionId,
          true,
          1500 + ((playerIndex + cohortIndex) % 1800),
          56 - cohortIndex * 7,
          playerIndex,
          false
        );

        if (playerIndex < d1Retained) {
          pushSessionTriplet(
            output,
            config,
            new Date(baseEndAt.getTime() + 24 * 60 * 60 * 1000),
            baseSeed,
            randomUUID(),
            true,
            1000 + ((playerIndex + cohortIndex) % 1200),
            55 - cohortIndex * 7,
            playerIndex,
            false
          );
        }

        if (playerIndex < d7Retained) {
          pushSessionTriplet(
            output,
            config,
            new Date(baseEndAt.getTime() + 7 * 24 * 60 * 60 * 1000),
            baseSeed,
            randomUUID(),
            true,
            900 + ((playerIndex + cohortIndex) % 1500),
            49 - cohortIndex * 7,
            playerIndex,
            false
          );
        }
      }
    });
  }

  return output.sort(
    (left, right) =>
      new Date(left.event.occurred_at).getTime() - new Date(right.event.occurred_at).getTime()
  );
};
