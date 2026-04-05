import { describe, expect, it } from 'vitest';

import { addUtcDays, enumerateCalendarDates, startOfUtcDay } from './date-range';

describe('date range helpers', () => {
  it('enumerates inclusive utc day ranges', () => {
    expect(
      enumerateCalendarDates(
        new Date('2026-04-03T12:15:00.000Z'),
        new Date('2026-04-05T02:00:00.000Z')
      )
    ).toEqual(['2026-04-03', '2026-04-04', '2026-04-05']);
  });

  it('normalizes dates to the start of the utc day', () => {
    expect(startOfUtcDay(new Date('2026-04-05T18:22:31.123Z')).toISOString()).toBe(
      '2026-04-05T00:00:00.000Z'
    );
  });

  it('adds utc days without leaking local timezone offsets', () => {
    expect(addUtcDays(new Date('2026-04-05T00:00:00.000Z'), -7).toISOString()).toBe(
      '2026-03-29T00:00:00.000Z'
    );
  });
});
