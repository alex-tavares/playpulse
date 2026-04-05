import { describe, expect, it } from 'vitest';

import { DualWindowRateLimiter } from './rate-limiter';

describe('DualWindowRateLimiter', () => {
  it('allows requests within the configured window and returns Retry-After when blocked', () => {
    let now = 0;
    const limiter = new DualWindowRateLimiter(2, 12, () => now, 10_000);

    expect(limiter.consume('ip:1').allowed).toBe(true);
    expect(limiter.consume('ip:1').allowed).toBe(true);

    const blockedDecision = limiter.consume('ip:1');
    expect(blockedDecision.allowed).toBe(false);
    expect(blockedDecision.retryAfterSec).toBeGreaterThan(0);

    now = 61_000;
    expect(limiter.consume('ip:1').allowed).toBe(true);
  });
});
