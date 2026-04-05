import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createSessionStartEvent } from '@playpulse/testkit';

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
