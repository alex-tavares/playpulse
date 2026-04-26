import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createCustomEvent, createSessionStartEvent } from '@playpulse/testkit';

import { createIngestApp } from './app';
import { readIngestConfig } from './config/ingest-config';
import { createLogger } from './lib/logger';
import { buildSignaturePayload, signSignaturePayload } from './lib/hmac';

const databaseUrl =
  process.env.PLAYPULSE_DATABASE_URL ?? 'postgresql://playpulse:playpulse@localhost:5432/playpulse';
const now = new Date('2025-09-20T18:22:32Z');

const baseEnv = {
  PLAYPULSE_DATABASE_URL: databaseUrl,
  PLAYPULSE_INGEST_API_KEYS_JSON: JSON.stringify([
    {
      enabled: true,
      game_id: 'mythclash',
      key_id: 'test-key',
      signing_secret: 'test-signing-secret',
    },
  ]),
  PLAYPULSE_RATE_LIMIT_PER_IP: '120',
  PLAYPULSE_RATE_LIMIT_PER_IP_BURST: '240',
  PLAYPULSE_RATE_LIMIT_PER_KEY: '600',
  PLAYPULSE_RATE_LIMIT_PER_KEY_BURST: '1200',
  PLAYPULSE_REPLAY_WINDOW_SECONDS: '300',
};

const baseBearerEnv = {
  ...baseEnv,
  PLAYPULSE_INGEST_AUTH_MODES: 'hmac,bearer_token',
  PLAYPULSE_INGEST_PUBLIC_CLIENTS_JSON: JSON.stringify([
    {
      allowed_build_ids: ['mc-2025.09.18'],
      allowed_game_versions: ['0.6.2'],
      allowed_origins: ['https://demo.itch.zone'],
      client_id: 'mythclash-web-060',
      enabled: true,
      event_rate_limit: {
        burst: 120,
        per_minute: 2,
      },
      game_id: 'mythclash',
      platform_channel: 'web_itch',
      token_rate_limit: {
        burst: 6,
        per_minute: 10,
      },
      token_ttl_seconds: 3_600,
    },
    {
      allowed_build_ids: ['mc-2025.09.18'],
      allowed_game_versions: ['0.6.2'],
      client_id: 'mythclash-windows-060',
      enabled: true,
      game_id: 'mythclash',
      platform_channel: 'windows',
      token_ttl_seconds: 3_600,
    },
    {
      allowed_build_ids: ['mc-2025.09.18'],
      allowed_game_versions: ['0.6.2'],
      client_id: 'mythclash-disabled-060',
      enabled: false,
      game_id: 'mythclash',
      platform_channel: 'linux',
      token_ttl_seconds: 3_600,
    },
  ]),
  PLAYPULSE_INGEST_TOKEN_SIGNING_SECRET: 'test-token-signing-secret-with-at-least-32-chars',
};

const buildSignedRequest = (
  body: unknown,
  overrides?: { nonce?: string; rawBody?: string; secret?: string; timestamp?: string }
) => {
  const timestamp = overrides?.timestamp ?? String(Math.floor(now.getTime() / 1000));
  const nonce = overrides?.nonce ?? 'f4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1';
  const rawBody = overrides?.rawBody ?? JSON.stringify(body);
  const signature = signSignaturePayload(
    buildSignaturePayload(timestamp, nonce, rawBody),
    overrides?.secret ?? 'test-signing-secret'
  ).toString('base64');

  return {
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': 'test-key',
      'X-Nonce': nonce,
      'X-Request-Timestamp': timestamp,
      'X-Signature': signature,
    },
    rawBody,
  };
};

const tokenRequestBody = (overrides: Record<string, unknown> = {}) => ({
  build_id: 'mc-2025.09.18',
  client_id: 'mythclash-web-060',
  game_id: 'mythclash',
  game_version: '0.6.2',
  platform: 'pc',
  platform_channel: 'web_itch',
  ...overrides,
});

const buildBearerHeaders = (token: string, nonce = 'f5c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1') => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  Origin: 'https://demo.itch.zone',
  'X-Nonce': nonce,
  'X-Request-Timestamp': String(Math.floor(now.getTime() / 1000)),
});

describe('ingest app integration', () => {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.eventRaw.deleteMany();
  });

  it('serves health responses', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.request_id).toBeTruthy();
  });

  it('propagates sanitized request ids and exposes privacy-safe metrics', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const signedRequest = buildSignedRequest(
      {
        events: [createSessionStartEvent()],
      },
      {
        nonce: '04c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
      }
    );

    const ingestResponse = await request(app)
      .post('/events')
      .set({
        ...signedRequest.headers,
        'X-Request-Id': 'smoke-request-1',
      })
      .send(signedRequest.rawBody);
    const metricsResponse = await request(app).get('/metrics');

    expect(ingestResponse.status).toBe(202);
    expect(ingestResponse.headers['x-request-id']).toBe('smoke-request-1');
    expect(ingestResponse.body.request_id).toBe('smoke-request-1');
    expect(metricsResponse.status).toBe(200);
    expect(metricsResponse.headers['content-type']).toContain('text/plain');
    expect(metricsResponse.text).toContain('ingest_requests_total{status_class="2xx",outcome="accepted"} 1');
    expect(metricsResponse.text).toContain('ingest_events_written_total{source="godot_sdk"} 1');
    expect(metricsResponse.text).not.toContain('test-key');
    expect(metricsResponse.text).not.toContain('player_id_hash');
  });

  it('accepts valid signed batches and persists rows', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const signedRequest = buildSignedRequest({
      events: [createSessionStartEvent()],
    });

    const response = await request(app).post('/events').set(signedRequest.headers).send(signedRequest.rawBody);

    expect(response.status).toBe(202);
    expect(response.body.data.accepted_count).toBe(1);
    expect(await prisma.eventRaw.count()).toBe(1);

    const storedEvent = await prisma.eventRaw.findFirstOrThrow();
    expect(storedEvent.consentAnalytics).toBe(true);
    expect(storedEvent.eventName).toBe('session_start');
  });

  it('accepts valid custom events, persists properties, and exposes aggregate custom metrics', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const signedRequest = buildSignedRequest(
      {
        events: [createCustomEvent()],
      },
      {
        nonce: '14c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
      }
    );

    const response = await request(app).post('/events').set(signedRequest.headers).send(signedRequest.rawBody);
    const metricsResponse = await request(app).get('/metrics');

    expect(response.status).toBe(202);
    expect(response.body.data.accepted_count).toBe(1);

    const storedEvent = await prisma.eventRaw.findFirstOrThrow();
    expect(storedEvent.eventName).toBe('level_end');
    expect(storedEvent.schemaVersion).toBe('1.1');
    expect(storedEvent.propsJsonb).toMatchObject({
      completed: true,
      duration_s: 180,
      level_id: 'forest_01',
    });
    expect(metricsResponse.text).toContain('ingest_custom_events_total{outcome="accepted"} 1');
    expect(metricsResponse.text).not.toContain('level_end');
  });

  it('issues public client tokens for enabled browser and native clients', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseBearerEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const webResponse = await request(app)
      .post('/client-tokens')
      .set('Origin', 'https://demo.itch.zone')
      .send(tokenRequestBody());
    const nativeResponse = await request(app)
      .post('/client-tokens')
      .send(
        tokenRequestBody({
          client_id: 'mythclash-windows-060',
          platform_channel: 'windows',
        })
      );

    expect(webResponse.status).toBe(200);
    expect(webResponse.body.data.token).toBeTruthy();
    expect(webResponse.body.data.expires_at).toBe('2025-09-20T19:22:32.000Z');
    expect(nativeResponse.status).toBe(200);
    expect(nativeResponse.body.data.token).toBeTruthy();
  });

  it('rejects public token requests for disabled clients, unsupported builds, and disallowed origins', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseBearerEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const disabledResponse = await request(app)
      .post('/client-tokens')
      .send(
        tokenRequestBody({
          client_id: 'mythclash-disabled-060',
          platform_channel: 'linux',
        })
      );
    const wrongBuildResponse = await request(app)
      .post('/client-tokens')
      .set('Origin', 'https://demo.itch.zone')
      .send(tokenRequestBody({ build_id: 'mc-wrong' }));
    const wrongOriginResponse = await request(app)
      .post('/client-tokens')
      .set('Origin', 'https://evil.example')
      .send(tokenRequestBody());

    expect(disabledResponse.status).toBe(401);
    expect(disabledResponse.body.error.code).toBe('unauthorized');
    expect(wrongBuildResponse.status).toBe(401);
    expect(wrongBuildResponse.body.error.code).toBe('unauthorized');
    expect(wrongOriginResponse.status).toBe(403);
    expect(wrongOriginResponse.body.error.code).toBe('origin_not_allowed');
  });

  it('accepts bearer-token event batches and stores public client lineage', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseBearerEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const tokenResponse = await request(app)
      .post('/client-tokens')
      .set('Origin', 'https://demo.itch.zone')
      .send(tokenRequestBody());
    const rawBody = JSON.stringify({
      events: [createSessionStartEvent()],
    });

    const response = await request(app)
      .post('/events')
      .set(buildBearerHeaders(tokenResponse.body.data.token as string))
      .send(rawBody);

    expect(response.status).toBe(202);
    expect(await prisma.eventRaw.count()).toBe(1);
    const storedEvent = await prisma.eventRaw.findFirstOrThrow();
    expect(storedEvent.apiKeyId).toBe('mythclash-web-060');
  });

  it('rejects bearer-token event batches for the wrong game', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseBearerEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const tokenResponse = await request(app)
      .post('/client-tokens')
      .set('Origin', 'https://demo.itch.zone')
      .send(tokenRequestBody());
    const rawBody = JSON.stringify({
      events: [
        createSessionStartEvent({
          game_id: 'mythtag',
        }),
      ],
    });

    const response = await request(app)
      .post('/events')
      .set(buildBearerHeaders(tokenResponse.body.data.token as string))
      .send(rawBody);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('unauthorized');
  });

  it('rejects expired, wrong-origin, and replayed bearer-token event requests', async () => {
    const tokenApp = createIngestApp({
      config: readIngestConfig(baseBearerEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const tokenResponse = await request(tokenApp)
      .post('/client-tokens')
      .set('Origin', 'https://demo.itch.zone')
      .send(tokenRequestBody());
    const token = tokenResponse.body.data.token as string;
    const rawBody = JSON.stringify({
      events: [createSessionStartEvent()],
    });

    const expiredApp = createIngestApp({
      config: readIngestConfig(baseBearerEnv),
      logger: createLogger(),
      now: () => new Date(now.getTime() + 3_601_000),
      prisma,
    });
    const expiredResponse = await request(expiredApp)
      .post('/events')
      .set(buildBearerHeaders(token))
      .send(rawBody);

    const wrongOriginResponse = await request(tokenApp)
      .post('/events')
      .set({
        ...buildBearerHeaders(token, '05c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1'),
        Origin: 'https://evil.example',
      })
      .send(rawBody);
    const firstReplayResponse = await request(tokenApp)
      .post('/events')
      .set(buildBearerHeaders(token, '15c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1'))
      .send(rawBody);
    const secondReplayResponse = await request(tokenApp)
      .post('/events')
      .set(buildBearerHeaders(token, '15c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1'))
      .send(rawBody);

    expect(expiredResponse.status).toBe(401);
    expect(expiredResponse.body.error.code).toBe('token_expired');
    expect(wrongOriginResponse.status).toBe(403);
    expect(wrongOriginResponse.body.error.code).toBe('origin_not_allowed');
    expect(firstReplayResponse.status).toBe(202);
    expect(secondReplayResponse.status).toBe(409);
    expect(secondReplayResponse.body.error.code).toBe('replay_detected');
  });

  it('rate limits public client event batches independently from HMAC keys', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseBearerEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const tokenResponse = await request(app)
      .post('/client-tokens')
      .set('Origin', 'https://demo.itch.zone')
      .send(tokenRequestBody());
    const token = tokenResponse.body.data.token as string;

    const firstResponse = await request(app)
      .post('/events')
      .set(buildBearerHeaders(token, '25c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1'))
      .send(
        JSON.stringify({
          events: [createSessionStartEvent()],
        })
      );
    const secondResponse = await request(app)
      .post('/events')
      .set(buildBearerHeaders(token, '35c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1'))
      .send(
        JSON.stringify({
          events: [
            createSessionStartEvent({
              event_id: '8bf42c51-4e08-4d6f-886d-53fe08d1c0b1',
            }),
          ],
        })
      );
    const thirdResponse = await request(app)
      .post('/events')
      .set(buildBearerHeaders(token, '45c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1'))
      .send(
        JSON.stringify({
          events: [
            createSessionStartEvent({
              event_id: '9bf42c51-4e08-4d6f-886d-53fe08d1c0b1',
            }),
          ],
        })
      );

    expect(firstResponse.status).toBe(202);
    expect(secondResponse.status).toBe(202);
    expect(thirdResponse.status).toBe(429);
    expect(thirdResponse.body.error.code).toBe('rate_limited_key');
  });

  it('rejects invalid custom events with validation_failed and aggregate custom metrics', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const signedRequest = buildSignedRequest(
      {
        events: [
          createCustomEvent({
            properties: {
              email: 'player@example.com',
            },
          }),
        ],
      },
      {
        nonce: '24c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
      }
    );

    const response = await request(app).post('/events').set(signedRequest.headers).send(signedRequest.rawBody);
    const metricsResponse = await request(app).get('/metrics');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
    expect(await prisma.eventRaw.count()).toBe(0);
    expect(metricsResponse.text).toContain('ingest_custom_events_total{outcome="rejected"} 1');
    expect(metricsResponse.text).not.toContain('level_end');
    expect(metricsResponse.text).not.toContain('player@example.com');
  });

  it('rejects custom events with unsafe identifier keys and values', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const signedRequest = buildSignedRequest(
      {
        events: [
          createCustomEvent({
            properties: {
              player_id: 'raw-player-123',
              level_id: 'player@example.com',
            },
          }),
        ],
      },
      {
        nonce: '34c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
      }
    );

    const response = await request(app).post('/events').set(signedRequest.headers).send(signedRequest.rawBody);
    const metricsResponse = await request(app).get('/metrics');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
    expect(await prisma.eventRaw.count()).toBe(0);
    expect(metricsResponse.text).toContain('ingest_custom_events_total{outcome="rejected"} 1');
    expect(metricsResponse.text).not.toContain('player_id');
    expect(metricsResponse.text).not.toContain('player@example.com');
  });

  it('rejects invalid JSON with bad_request', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const signedRequest = buildSignedRequest(null, {
      nonce: '54c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
      rawBody: '{',
    });

    const response = await request(app).post('/events').set(signedRequest.headers).send('{');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('bad_request');
  });

  it('rejects schema-invalid payloads with validation_failed', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const payload = {
      events: [
        createSessionStartEvent({
          properties: {
            launch_reason: 'startup' as never,
          },
        }),
      ],
    };
    const signedRequest = buildSignedRequest(payload, {
      nonce: '64c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
    });

    const response = await request(app).post('/events').set(signedRequest.headers).send(signedRequest.rawBody);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
  });

  it('rejects unsupported major versions with unsupported_schema_version', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const payload = {
      events: [
        createSessionStartEvent({
          schema_version: '2.0',
        }),
      ],
    };
    const signedRequest = buildSignedRequest(payload, {
      nonce: '74c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
    });

    const response = await request(app).post('/events').set(signedRequest.headers).send(signedRequest.rawBody);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('unsupported_schema_version');
  });

  it('rejects missing auth with unauthorized', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });

    const response = await request(app).post('/events').set('Content-Type', 'application/json').send(
      JSON.stringify({
        events: [createSessionStartEvent()],
      })
    );

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('unauthorized');
  });

  it('rejects bad signatures with signature_invalid', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const signedRequest = buildSignedRequest(
      {
        events: [createSessionStartEvent()],
      },
      {
        nonce: '84c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
        secret: 'wrong-secret',
      }
    );

    const response = await request(app).post('/events').set(signedRequest.headers).send(signedRequest.rawBody);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('signature_invalid');
  });

  it('rejects stale timestamps with timestamp_out_of_window', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const staleTimestamp = String(Math.floor(now.getTime() / 1000) - 301);
    const signedRequest = buildSignedRequest(
      {
        events: [createSessionStartEvent()],
      },
      {
        nonce: '94c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
        timestamp: staleTimestamp,
      }
    );

    const response = await request(app).post('/events').set(signedRequest.headers).send(signedRequest.rawBody);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('timestamp_out_of_window');
  });

  it('rejects replayed requests with replay_detected', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const signedRequest = buildSignedRequest(
      {
        events: [createSessionStartEvent()],
      },
      {
        nonce: 'a4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1',
      }
    );

    const firstResponse = await request(app)
      .post('/events')
      .set(signedRequest.headers)
      .send(signedRequest.rawBody);
    const secondResponse = await request(app)
      .post('/events')
      .set(signedRequest.headers)
      .send(signedRequest.rawBody);

    expect(firstResponse.status).toBe(202);
    expect(secondResponse.status).toBe(409);
    expect(secondResponse.body.error.code).toBe('replay_detected');
  });

  it('enforces the per-ip rate limit', async () => {
    const app = createIngestApp({
      config: readIngestConfig({
        ...baseEnv,
        PLAYPULSE_RATE_LIMIT_PER_IP: '1',
        PLAYPULSE_RATE_LIMIT_PER_IP_BURST: '6',
      }),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const firstRequest = buildSignedRequest(
      { events: [createSessionStartEvent()] },
      { nonce: 'b4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1' }
    );
    const secondRequest = buildSignedRequest(
      { events: [createSessionStartEvent({ event_id: '1bf42c51-4e08-4d6f-886d-53fe08d1c0b1' })] },
      { nonce: 'c4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1' }
    );

    await request(app).post('/events').set(firstRequest.headers).send(firstRequest.rawBody);
    const response = await request(app).post('/events').set(secondRequest.headers).send(secondRequest.rawBody);

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('rate_limited_ip');
    expect(response.headers['retry-after']).toBeTruthy();
  });

  it('enforces the per-key rate limit', async () => {
    const app = createIngestApp({
      config: readIngestConfig({
        ...baseEnv,
        PLAYPULSE_RATE_LIMIT_PER_KEY: '1',
        PLAYPULSE_RATE_LIMIT_PER_KEY_BURST: '6',
      }),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const firstRequest = buildSignedRequest(
      { events: [createSessionStartEvent()] },
      { nonce: 'd4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1' }
    );
    const secondRequest = buildSignedRequest(
      { events: [createSessionStartEvent({ event_id: '6bf42c51-4e08-4d6f-886d-53fe08d1c0b1' })] },
      { nonce: 'e4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1' }
    );

    await request(app).post('/events').set(firstRequest.headers).send(firstRequest.rawBody);
    const response = await request(app).post('/events').set(secondRequest.headers).send(secondRequest.rawBody);

    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('rate_limited_key');
    expect(response.headers['retry-after']).toBeTruthy();
  });

  it('rejects bodies over 1 MB with payload_too_large', async () => {
    const app = createIngestApp({
      config: readIngestConfig(baseEnv),
      logger: createLogger(),
      now: () => now,
      prisma,
    });
    const largeBody = JSON.stringify({
      events: [
        createSessionStartEvent({
          properties: {
            launch_reason: 'fresh_launch',
            connection_mode: 'online',
            timezone_offset_min: -240,
          },
        }),
      ],
      padding: 'x'.repeat(1_048_576),
    });

    const response = await request(app)
      .post('/events')
      .set('Content-Type', 'application/json')
      .send(largeBody);

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('payload_too_large');
  });
});
