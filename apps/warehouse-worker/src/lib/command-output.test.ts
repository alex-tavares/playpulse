import { describe, expect, it } from 'vitest';

import { createCommandOutput } from './command-output';

describe('warehouse command output', () => {
  it('adds refresh timing and freshness fields without changing command payload fields', () => {
    const output = createCommandOutput(
      'refresh:all',
      Date.parse('2026-04-24T20:27:17.000Z'),
      () => new Date('2026-04-24T20:27:17.462Z'),
      {
        cohort_count: 18,
      }
    );

    expect(output).toEqual({
      cohort_count: 18,
      command: 'refresh:all',
      duration_ms: 462,
      refreshed_at: '2026-04-24T20:27:17.462Z',
      status: 'ok',
    });
  });
});
