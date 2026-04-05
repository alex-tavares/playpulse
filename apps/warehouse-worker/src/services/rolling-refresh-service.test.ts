import { describe, expect, it, vi } from 'vitest';

import { RollingRefreshService } from './rolling-refresh-service';

describe('RollingRefreshService', () => {
  it('runs refresh steps in the documented order', async () => {
    const calls: string[] = [];
    const service = new RollingRefreshService({
      ensureDimDateCoverage: async () => {
        calls.push('dim_dates');
      },
      refreshCharacterPopularity: async () => {
        calls.push('character_popularity');
      },
      refreshMetricsSummary: async () => {
        calls.push('metrics_summary');
      },
      refreshSessionsDaily: async () => {
        calls.push('sessions_daily');
      },
    });

    await service.run();

    expect(calls).toEqual([
      'dim_dates',
      'sessions_daily',
      'character_popularity',
      'metrics_summary',
    ]);
  });

  it('stops immediately when a refresh step fails', async () => {
    const refreshCharacterPopularity = vi.fn();
    const refreshMetricsSummary = vi.fn();
    const service = new RollingRefreshService({
      ensureDimDateCoverage: async () => undefined,
      refreshCharacterPopularity,
      refreshMetricsSummary,
      refreshSessionsDaily: async () => {
        throw new Error('refresh failed');
      },
    });

    await expect(service.run()).rejects.toThrow('refresh failed');
    expect(refreshCharacterPopularity).not.toHaveBeenCalled();
    expect(refreshMetricsSummary).not.toHaveBeenCalled();
  });
});
