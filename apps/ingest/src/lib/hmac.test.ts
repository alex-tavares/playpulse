import { describe, expect, it } from 'vitest';

import { buildSignaturePayload, hashOpaqueValue, signSignaturePayload, verifySignature } from './hmac';

describe('hmac helpers', () => {
  it('verifies valid HMAC signatures built from raw body bytes', () => {
    const payload = buildSignaturePayload('1726858805', 'f4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1', '{"ok":true}');
    const signature = signSignaturePayload(payload, 'test-secret').toString('base64');

    expect(verifySignature(payload, 'test-secret', signature)).toBe(true);
  });

  it('rejects tampered signatures', () => {
    const payload = buildSignaturePayload('1726858805', 'f4c9f3e0-1e4d-4e4e-9c7b-6e8b5a23c4c1', '{"ok":true}');
    const signature = signSignaturePayload(payload, 'wrong-secret').toString('base64');

    expect(verifySignature(payload, 'test-secret', signature)).toBe(false);
  });

  it('hashes opaque values with sha256', () => {
    expect(hashOpaqueValue('test-key')).toHaveLength(64);
  });
});
