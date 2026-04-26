import type { PublicClientRateLimitConfig } from '../config/ingest-config';
import { DualWindowRateLimiter, type RateLimitDecision } from './rate-limiter';

export class ConfiguredRateLimiter {
  private readonly limiters = new Map<string, DualWindowRateLimiter>();

  consume(key: string, config: PublicClientRateLimitConfig): RateLimitDecision {
    const limiter = this.getLimiter(key, config);
    return limiter.consume(key);
  }

  private getLimiter(key: string, config: PublicClientRateLimitConfig) {
    const mapKey = `${key}:${config.perMinute}:${config.burst}`;
    const existing = this.limiters.get(mapKey);
    if (existing) {
      return existing;
    }

    const limiter = new DualWindowRateLimiter(config.perMinute, config.burst);
    this.limiters.set(mapKey, limiter);
    return limiter;
  }
}
