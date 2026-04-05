import { describe, expect, it } from 'vitest';

import { defaultPlayPulseEnv, readPlayPulseConfig } from './index';

describe('config', () => {
  it('uses documented defaults when env vars are absent', () => {
    const config = readPlayPulseConfig({});

    expect(config).toEqual(defaultPlayPulseEnv);
  });

  it('parses valid overrides', () => {
    const config = readPlayPulseConfig({
      PLAYPULSE_ANALYTICS_SLO_P95_MS: '450',
      PLAYPULSE_DATABASE_URL: 'postgresql://example:example@localhost:5432/example',
      PLAYPULSE_RATE_LIMIT_PER_KEY: '700',
    });

    expect(config.PLAYPULSE_ANALYTICS_SLO_P95_MS).toBe(450);
    expect(config.PLAYPULSE_RATE_LIMIT_PER_KEY).toBe(700);
    expect(config.PLAYPULSE_DATABASE_URL).toBe(
      'postgresql://example:example@localhost:5432/example'
    );
  });

  it('rejects invalid numeric env formats', () => {
    expect(() =>
      readPlayPulseConfig({
        PLAYPULSE_RATE_LIMIT_PER_IP: 'fast',
      })
    ).toThrow();
  });

  it('rejects invalid database URLs', () => {
    expect(() =>
      readPlayPulseConfig({
        PLAYPULSE_DATABASE_URL: 'mysql://localhost/playpulse',
      })
    ).toThrow();
  });
});
