import { describe, expect, it } from 'vitest';

import { runSmoke } from './playpulse-smoke.mjs';

describe('playpulse smoke script', () => {
  it('fails when a required health check is not ok', async () => {
    const result = await runSmoke(
      {
        PLAYPULSE_SMOKE_ANALYTICS_BASE_URL: 'http://analytics.test',
        PLAYPULSE_SMOKE_INGEST_BASE_URL: 'http://ingest.test',
      },
      async (url) => ({
        ok: String(url).includes('analytics.test'),
        status: String(url).includes('analytics.test') ? 200 : 503,
        text: async () => '{"data":{"status":"ok"},"request_id":"test"}',
        json: async () => ({ data: { status: 'ok' }, request_id: 'test' }),
      }),
      () => {}
    );

    expect(result.ok).toBe(false);
    expect(result.failures).toContain('ingest health returned HTTP 503');
  });
});
