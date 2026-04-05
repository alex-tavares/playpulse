import { describe, expect, it } from 'vitest';

import { requirePrivateBearerToken } from './private-auth';

describe('requirePrivateBearerToken', () => {
  it('accepts a matching bearer token', () => {
    expect(() =>
      requirePrivateBearerToken('Bearer playpulse-local-private-token', 'playpulse-local-private-token')
    ).not.toThrow();
  });

  it('rejects missing or invalid bearer tokens', () => {
    expect(() => requirePrivateBearerToken(undefined, 'expected')).toThrow(
      'Valid bearer token is required'
    );
    expect(() => requirePrivateBearerToken('Bearer wrong', 'expected')).toThrow(
      'Valid bearer token is required'
    );
  });
});
