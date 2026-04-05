import { describe, expect, it } from 'vitest';

import { ReplayCache } from './replay-cache';

describe('ReplayCache', () => {
  it('treats nonce casing as the same replay key', () => {
    let now = 0;
    const cache = new ReplayCache(300_000, () => now);

    expect(cache.register('test-key', 'F4C9F3E0-1E4D-4E4E-9C7B-6E8B5A23C4C1').isReplay).toBe(false);
    expect(cache.register('test-key', 'f4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1').isReplay).toBe(true);

    now = 301_000;

    expect(cache.register('test-key', 'f4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1').isReplay).toBe(false);
  });
});
