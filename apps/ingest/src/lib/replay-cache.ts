type Clock = () => number;

export interface ReplayDecision {
  isReplay: boolean;
}

export class ReplayCache {
  private readonly entries = new Map<string, number>();

  constructor(
    private readonly windowMs: number,
    private readonly clock: Clock = () => Date.now()
  ) {}

  register(apiKeyId: string, nonce: string): ReplayDecision {
    const now = this.clock();
    const normalizedNonce = nonce.toLowerCase();
    const compositeKey = `${apiKeyId}:${normalizedNonce}`;

    for (const [key, expiresAt] of this.entries.entries()) {
      if (expiresAt <= now) {
        this.entries.delete(key);
      }
    }

    const existingExpiry = this.entries.get(compositeKey);
    if (existingExpiry && existingExpiry > now) {
      return { isReplay: true };
    }

    this.entries.set(compositeKey, now + this.windowMs);

    return { isReplay: false };
  }
}
