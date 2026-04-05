type Clock = () => number;

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSec: number;
}

class SlidingWindow {
  private readonly entries = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly clock: Clock
  ) {}

  consume(key: string): RateLimitDecision {
    const now = this.clock();
    const existing = this.entries.get(key) ?? [];
    const fresh = existing.filter((timestamp) => now - timestamp < this.windowMs);

    if (fresh.length >= this.limit) {
      const oldest = fresh[0] ?? now;
      this.entries.set(key, fresh);

      return {
        allowed: false,
        retryAfterSec: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)),
      };
    }

    fresh.push(now);
    this.entries.set(key, fresh);

    return {
      allowed: true,
      retryAfterSec: 0,
    };
  }
}

export class DualWindowRateLimiter {
  private readonly sustainedWindow: SlidingWindow;
  private readonly burstWindow: SlidingWindow;

  constructor(
    sustainedPerMinute: number,
    burstPerMinute: number,
    private readonly clock: Clock = () => Date.now(),
    burstWindowMs = 10_000
  ) {
    const burstLimit = Math.max(1, Math.ceil((burstPerMinute * burstWindowMs) / 60_000));
    this.sustainedWindow = new SlidingWindow(sustainedPerMinute, 60_000, this.clock);
    this.burstWindow = new SlidingWindow(burstLimit, burstWindowMs, this.clock);
  }

  consume(key: string): RateLimitDecision {
    const burstDecision = this.burstWindow.consume(key);
    if (!burstDecision.allowed) {
      return burstDecision;
    }

    return this.sustainedWindow.consume(key);
  }
}
