import { describe, expect, it } from 'vitest';

import {
  createDashboardSessionValue,
  normalizeRedirectTarget,
  verifyDashboardSessionValue,
} from './dashboard-auth';

describe('dashboard auth helpers', () => {
  it('creates and verifies a signed dashboard session value', () => {
    const value = createDashboardSessionValue('demo-code');

    expect(verifyDashboardSessionValue(value, 'demo-code')).toBe(true);
    expect(verifyDashboardSessionValue(value, 'wrong-code')).toBe(false);
  });

  it('normalizes unsafe redirect targets', () => {
    expect(normalizeRedirectTarget('/private-insights?game_id=all')).toBe(
      '/private-insights?game_id=all'
    );
    expect(normalizeRedirectTarget('https://example.com')).toBe('/private-insights');
    expect(normalizeRedirectTarget('//evil.example')).toBe('/private-insights');
    expect(normalizeRedirectTarget(undefined)).toBe('/private-insights');
  });
});
