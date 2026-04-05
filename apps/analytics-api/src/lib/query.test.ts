import { describe, expect, it } from 'vitest';

import {
  parseGameIdQuery,
  parsePopularityDaysQuery,
  parseRetentionWeeksQuery,
  parseSessionsDaysQuery,
} from './query';

describe('analytics query parsing', () => {
  it('parses valid game, days, and weeks queries', () => {
    expect(parseGameIdQuery('all')).toBe('all');
    expect(parseSessionsDaysQuery('30')).toBe(30);
    expect(parsePopularityDaysQuery('14')).toBe(14);
    expect(parseRetentionWeeksQuery('8')).toBe(8);
  });

  it('rejects invalid analytics query values', () => {
    expect(() => parseGameIdQuery('unknown')).toThrow('Query parameters did not match the expected schema');
    expect(() => parseSessionsDaysQuery('9')).toThrow('Query parameters did not match the expected schema');
    expect(() => parsePopularityDaysQuery('30')).toThrow('Query parameters did not match the expected schema');
    expect(() => parseRetentionWeeksQuery('9')).toThrow('Query parameters did not match the expected schema');
  });
});
