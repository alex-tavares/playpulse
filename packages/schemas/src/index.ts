import { z } from 'zod';

const maxByteLength = <T extends z.ZodTypeAny>(schema: T, maxBytes: number, label: string) =>
  schema.superRefine((value, ctx) => {
    const size = Buffer.byteLength(JSON.stringify(value), 'utf8');
    if (size > maxBytes) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${label} must be at most ${maxBytes} bytes`,
      });
    }
  });

const snakeCaseSchema = z.string().regex(/^[a-z][a-z0-9_]*$/, 'must be snake_case');
const schemaVersionSchema = z.string().regex(/^\d+\.\d+$/, 'must use major.minor version format');
const localeSchema = z.string().min(2).max(8);
const gameVersionSchema = z.string().regex(/^\d+\.\d+\.\d+$/, 'must be semver');
const buildIdSchema = z.string().min(1).max(16);
const lowerHex64Schema = z.string().regex(/^[a-f0-9]{64}$/, 'must be a 64-char lowercase hex string');

export const gameIdSchema = z.enum(['mythclash', 'mythtag']);
export const analyticsQueryGameIdSchema = z.enum(['mythclash', 'mythtag', 'all']);
export const platformSchema = z.enum(['pc', 'mac', 'linux']);
const requestIdSchema = z.string().min(1);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must use YYYY-MM-DD format');
const isoDateTimeSchema = z.string().datetime({ offset: true });
const customEventNameMaxLength = 48;
const customEventMaxBytes = 2048;
const customEventPropertiesMaxBytes = 1536;
const customEventPropertyKeyMaxCount = 25;
const customEventStringMaxLength = 128;

export const eventEnvelopeSchema = z.object({
  event_id: z.string().uuid(),
  event_name: snakeCaseSchema.max(48),
  schema_version: schemaVersionSchema,
  occurred_at: z.string().datetime({ offset: true }),
  session_id: z.string().uuid(),
  player_id_hash: lowerHex64Schema,
  game_id: gameIdSchema,
  game_version: gameVersionSchema,
  build_id: buildIdSchema,
  platform: platformSchema,
  locale: localeSchema.optional(),
  consent_analytics: z.boolean(),
});

export const coreEventNames = [
  'session_start',
  'session_end',
  'match_start',
  'match_end',
  'character_selected',
] as const;

export const coreEventNameSchema = z.enum(coreEventNames);
export type CoreEventName = z.infer<typeof coreEventNameSchema>;

const coreEventNameSet = new Set<string>(coreEventNames);

export const isCoreEventName = (eventName: string): eventName is CoreEventName =>
  coreEventNameSet.has(eventName);

export const customEventNameSchema = snakeCaseSchema
  .max(customEventNameMaxLength)
  .refine((eventName) => !isCoreEventName(eventName), {
    message: 'custom event_name must not use a reserved core event name',
  });

export const isCustomEventName = (eventName: string) =>
  customEventNameSchema.safeParse(eventName).success;

const customEventAllowedGameplayPropertyKeys = new Set([
  'build_id',
  'character_id',
  'item_id',
  'level_id',
  'loadout_id',
  'map_id',
  'match_id',
  'mode_id',
  'quest_id',
]);

const customEventSensitivePropertyKeys = new Set([
  'access_token',
  'address',
  'api_key',
  'auth_token',
  'authorization_header',
  'chat',
  'chat_text',
  'cookie',
  'device_id',
  'email',
  'email_address',
  'error_message',
  'ip',
  'jwt',
  'message',
  'name',
  'password',
  'phone',
  'phone_number',
  'player_id',
  'player_id_hash',
  'player_name',
  'refresh_token',
  'secret',
  'session_id',
  'token',
  'user_name',
  'user_id',
]);

const sensitivePropertySubjects = [
  'access',
  'account',
  'api',
  'auth',
  'authorization',
  'device',
  'email',
  'phone',
  'player',
  'profile',
  'refresh',
  'session',
  'user',
];
const sensitivePropertySuffixes = ['id', 'identifier', 'hash', 'key', 'token', 'uuid'];

const emailLikeStringPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const jwtLikeStringPattern = /^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const bearerLikeStringPattern = /^bearer\s+\S+$/i;

const isSensitiveCustomEventPropertyKey = (key: string) => {
  if (customEventAllowedGameplayPropertyKeys.has(key)) {
    return false;
  }

  if (customEventSensitivePropertyKeys.has(key)) {
    return true;
  }

  return sensitivePropertySubjects.some((subject) =>
    sensitivePropertySuffixes.some((suffix) => {
      const exactKey = `${subject}_${suffix}`;
      return key === exactKey || (key.startsWith(`${subject}_`) && key.endsWith(`_${suffix}`));
    })
  );
};

const isSafeCustomEventString = (value: string) =>
  value.length <= customEventStringMaxLength &&
  !emailLikeStringPattern.test(value) &&
  !jwtLikeStringPattern.test(value) &&
  !bearerLikeStringPattern.test(value);

export const customEventPropertyKeySchema = snakeCaseSchema.refine(
  (key) => !isSensitiveCustomEventPropertyKey(key),
  {
    message: 'custom event property key is reserved for privacy',
  }
);

const customEventStringValueSchema = z.string().refine(isSafeCustomEventString, {
  message: `custom event string values must be privacy-safe and at most ${customEventStringMaxLength} characters`,
});
const customEventPrimitiveValueSchema = z.union([
  customEventStringValueSchema,
  z.number().finite(),
  z.boolean(),
]);
export const customEventPropertyValueSchema = z.union([
  customEventPrimitiveValueSchema,
  z.array(customEventPrimitiveValueSchema),
]);

export const customEventPropertiesSchema = maxByteLength(
  z.record(customEventPropertyKeySchema, customEventPropertyValueSchema).superRefine(
    (properties, ctx) => {
      if (Object.keys(properties).length > customEventPropertyKeyMaxCount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `custom event properties must have at most ${customEventPropertyKeyMaxCount} keys`,
        });
      }
    }
  ),
  customEventPropertiesMaxBytes,
  'custom event properties'
);

const sessionStartPropertiesSchema = maxByteLength(
  z.object({
    launch_reason: z.enum(['fresh_launch', 'resume', 'hot_reload']),
    connection_mode: z.enum(['online', 'offline']),
    timezone_offset_min: z.number().int().min(-720).max(840),
  }),
  1536,
  'session_start properties'
);

const sessionEndPropertiesSchema = maxByteLength(
  z.object({
    duration_s: z.number().int().min(0).max(86400),
    exit_reason: z.enum(['user_exit', 'disconnect', 'crash', 'idle_timeout']),
    xp_earned: z.number().int().min(0).max(1000),
  }),
  1536,
  'session_end properties'
);

const matchStartPropertiesSchema = maxByteLength(
  z.object({
    match_id: z.string().uuid(),
    mode_id: z.string().min(1).max(32),
    map_id: z.string().min(1).max(32),
    team_size: z.number().int().min(1).max(5),
    party_size: z.number().int().min(1).max(4),
    mmr_bucket: z.enum(['bronze', 'silver', 'gold', 'diamond']),
  }),
  1536,
  'match_start properties'
);

const matchEndPropertiesSchema = maxByteLength(
  z.object({
    match_id: z.string().uuid(),
    duration_s: z.number().int().min(0).max(7200),
    result: z.enum(['win', 'loss', 'draw', 'abandon']),
    character_id: z.string().min(1).max(32),
    score: z.number().int().min(0).max(100000),
    damage_dealt: z.number().int().min(0).max(500000),
  }),
  1536,
  'match_end properties'
);

const characterSelectedPropertiesSchema = maxByteLength(
  z.object({
    selection_context: z.enum(['match_lobby', 'armory', 'tutorial']),
    character_id: z.string().min(1).max(32),
    loadout_id: z.string().min(1).max(32).optional(),
    perk_ids: z.array(z.string().min(1).max(32)).max(5).optional(),
    is_random: z.boolean(),
  }),
  1536,
  'character_selected properties'
);

const mvpEventSchemaFactory = <T extends z.ZodTypeAny>(
  eventName: CoreEventName,
  propertiesSchema: T
) =>
  maxByteLength(
    eventEnvelopeSchema.extend({
      event_name: z.literal(eventName),
      properties: propertiesSchema,
    }),
    2048,
    eventName
  );

export const sessionStartEventSchema = mvpEventSchemaFactory(
  'session_start',
  sessionStartPropertiesSchema
);
export const sessionEndEventSchema = mvpEventSchemaFactory('session_end', sessionEndPropertiesSchema);
export const matchStartEventSchema = mvpEventSchemaFactory('match_start', matchStartPropertiesSchema);
export const matchEndEventSchema = mvpEventSchemaFactory('match_end', matchEndPropertiesSchema);
export const characterSelectedEventSchema = mvpEventSchemaFactory(
  'character_selected',
  characterSelectedPropertiesSchema
);

export const mvpEventSchema = z.union([
  sessionStartEventSchema,
  sessionEndEventSchema,
  matchStartEventSchema,
  matchEndEventSchema,
  characterSelectedEventSchema,
]);

export const customEventSchema = maxByteLength(
  eventEnvelopeSchema.extend({
    event_name: customEventNameSchema,
    schema_version: z.literal('1.1'),
    properties: customEventPropertiesSchema,
  }),
  customEventMaxBytes,
  'custom event'
);

export const telemetryEventSchema = z.union([
  sessionStartEventSchema,
  sessionEndEventSchema,
  matchStartEventSchema,
  matchEndEventSchema,
  characterSelectedEventSchema,
  customEventSchema,
]);

export const ingestEventsRequestSchema = z.object({
  events: z.array(telemetryEventSchema).min(1).max(10),
});

const analyticsMetricValueSchema = z.object({
  suppressed: z.boolean(),
  value: z.number().int().nonnegative().nullable(),
});

export const analyticsSummaryResponseSchema = z.object({
  data: z.object({
    game_id: analyticsQueryGameIdSchema,
    last_updated: isoDateTimeSchema,
    metrics: z.object({
      active_players: analyticsMetricValueSchema,
      avg_session_length_s: analyticsMetricValueSchema,
      matches_today: analyticsMetricValueSchema,
    }),
  }),
  request_id: requestIdSchema,
});

export const analyticsSessionsDailyResponseSchema = z.object({
  data: z.object({
    days: z.union([z.literal(7), z.literal(14), z.literal(30)]),
    game_id: analyticsQueryGameIdSchema,
    last_updated: isoDateTimeSchema,
    points: z.array(
      z.object({
        active_players: z.number().int().nonnegative().nullable(),
        avg_session_length_s: z.number().int().nonnegative().nullable(),
        metric_date: isoDateSchema,
        session_count: z.number().int().nonnegative().nullable(),
        suppressed: z.boolean(),
      })
    ),
  }),
  request_id: requestIdSchema,
});

export const analyticsCharacterPopularityResponseSchema = z.object({
  data: z.object({
    characters: z.array(
      z.object({
        character_id: z.string().min(1).max(32),
        pick_count: z.number().int().nonnegative().nullable(),
        pick_ratio: z.number().min(0).max(1),
        suppressed: z.boolean(),
      })
    ),
    days: z.union([z.literal(7), z.literal(14)]),
    game_id: analyticsQueryGameIdSchema,
    last_updated: isoDateTimeSchema,
  }),
  request_id: requestIdSchema,
});

export const analyticsRetentionCohortsResponseSchema = z.object({
  data: z.object({
    cohorts: z.array(
      z.object({
        cohort_date: isoDateSchema,
        cohort_size: z.number().int().nonnegative(),
        d1_retained: z.number().int().nonnegative().nullable(),
        d1_retention_pct: z.number().min(0).max(1),
        d1_suppressed: z.boolean(),
        d7_retained: z.number().int().nonnegative().nullable(),
        d7_retention_pct: z.number().min(0).max(1),
        d7_suppressed: z.boolean(),
      })
    ),
    game_id: analyticsQueryGameIdSchema,
    last_updated: isoDateTimeSchema,
    weeks: z.number().int().min(1).max(8),
  }),
  request_id: requestIdSchema,
});

const customEventNameMetricSchema = z.object({
  event_count: z.number().int().nonnegative(),
  event_name: customEventNameSchema,
  first_seen: isoDateTimeSchema,
  last_seen: isoDateTimeSchema,
});

export const customEventNamesResponseSchema = z.object({
  data: z.object({
    days: z.number().int().min(1).max(30),
    events: z.array(customEventNameMetricSchema),
    game_id: analyticsQueryGameIdSchema,
    last_updated: isoDateTimeSchema,
  }),
  request_id: requestIdSchema,
});

export const customEventCountsResponseSchema = z.object({
  data: z.object({
    days: z.number().int().min(1).max(30),
    event_name: customEventNameSchema,
    game_id: analyticsQueryGameIdSchema,
    last_updated: isoDateTimeSchema,
    points: z.array(
      z.object({
        event_count: z.number().int().nonnegative(),
        metric_date: isoDateSchema,
      })
    ),
  }),
  request_id: requestIdSchema,
});

export const customEventRecentResponseSchema = z.object({
  data: z.object({
    event_name: customEventNameSchema,
    events: z.array(
      z.object({
        build_id: buildIdSchema,
        consent_analytics: z.boolean(),
        event_id: z.string().uuid(),
        event_name: customEventNameSchema,
        game_id: gameIdSchema,
        game_version: gameVersionSchema,
        locale: localeSchema.nullable(),
        occurred_at: isoDateTimeSchema,
        platform: platformSchema,
        properties: customEventPropertiesSchema,
        received_at: isoDateTimeSchema,
        schema_version: z.literal('1.1'),
      })
    ),
    game_id: analyticsQueryGameIdSchema,
    last_updated: isoDateTimeSchema,
    limit: z.number().int().min(1).max(100),
  }),
  request_id: requestIdSchema,
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;
export type SessionStartEvent = z.infer<typeof sessionStartEventSchema>;
export type SessionEndEvent = z.infer<typeof sessionEndEventSchema>;
export type MatchStartEvent = z.infer<typeof matchStartEventSchema>;
export type MatchEndEvent = z.infer<typeof matchEndEventSchema>;
export type CharacterSelectedEvent = z.infer<typeof characterSelectedEventSchema>;
export type MvpEvent = z.infer<typeof mvpEventSchema>;
export type CustomEvent = z.infer<typeof customEventSchema>;
export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;
export type IngestEventsRequest = z.infer<typeof ingestEventsRequestSchema>;
export type AnalyticsQueryGameId = z.infer<typeof analyticsQueryGameIdSchema>;
export type AnalyticsSummaryResponse = z.infer<typeof analyticsSummaryResponseSchema>;
export type AnalyticsSessionsDailyResponse = z.infer<typeof analyticsSessionsDailyResponseSchema>;
export type AnalyticsCharacterPopularityResponse = z.infer<
  typeof analyticsCharacterPopularityResponseSchema
>;
export type AnalyticsRetentionCohortsResponse = z.infer<
  typeof analyticsRetentionCohortsResponseSchema
>;
export type CustomEventNamesResponse = z.infer<typeof customEventNamesResponseSchema>;
export type CustomEventCountsResponse = z.infer<typeof customEventCountsResponseSchema>;
export type CustomEventRecentResponse = z.infer<typeof customEventRecentResponseSchema>;
