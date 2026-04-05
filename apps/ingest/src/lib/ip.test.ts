import { describe, expect, it } from 'vitest';

import { sanitizeUserAgent, truncateIpAddress } from './ip';

describe('ip helpers', () => {
  it('truncates ipv4 addresses to /24', () => {
    expect(truncateIpAddress('192.168.10.42')).toBe('192.168.10.0/24');
    expect(truncateIpAddress('::ffff:10.0.0.1')).toBe('10.0.0.0/24');
  });

  it('truncates ipv6 addresses to /48', () => {
    expect(truncateIpAddress('2001:0db8:85a3::8a2e:0370:7334')).toBe('2001:db8:85a3::/48');
  });

  it('sanitizes and truncates user agents', () => {
    expect(sanitizeUserAgent(undefined)).toBe('unknown');
    expect(sanitizeUserAgent('a'.repeat(150))).toHaveLength(120);
  });
});
