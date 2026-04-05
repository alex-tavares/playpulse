import React from 'react';
import type { AnalyticsSummaryResponse } from '@playpulse/schemas';

import type { AnalyticsFetchResult } from '../lib/analytics-client';
import { formatCompactNumber, formatDurationSeconds, formatLastUpdated } from '../lib/format';

interface MetricSummaryStripProps {
  result: AnalyticsFetchResult<AnalyticsSummaryResponse>;
}

interface MetricCardProps {
  label: string;
  lastUpdated?: string;
  suppressed?: boolean;
  value: string;
}

const MetricCard = ({ label, lastUpdated, suppressed, value }: MetricCardProps) => (
  <article className="rounded-xl border border-pine/10 bg-white/90 p-5 shadow-card">
    <p className="text-sm uppercase tracking-[0.2em] text-pine/55">{label}</p>
    <p className="mt-4 font-display text-3xl font-semibold text-ink">{value}</p>
    <p className="mt-3 text-sm text-pine/75">
      {suppressed ? 'Hidden to protect player privacy' : lastUpdated ? `Updated ${lastUpdated}` : 'Waiting for analytics data'}
    </p>
  </article>
);

export const MetricSummaryStrip = ({ result }: MetricSummaryStripProps) => {
  if (result.status === 'error') {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {['Active Players', 'Matches Today', 'Avg Session Length'].map((label) => (
          <MetricCard key={label} label={label} value="Unavailable" />
        ))}
      </div>
    );
  }

  const { metrics, last_updated: lastUpdated } = result.data.data;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Active Players"
        lastUpdated={formatLastUpdated(lastUpdated)}
        suppressed={metrics.active_players.suppressed}
        value={
          metrics.active_players.suppressed || metrics.active_players.value === null
            ? 'Hidden'
            : formatCompactNumber(metrics.active_players.value)
        }
      />
      <MetricCard
        label="Matches Today"
        lastUpdated={formatLastUpdated(lastUpdated)}
        suppressed={metrics.matches_today.suppressed}
        value={
          metrics.matches_today.suppressed || metrics.matches_today.value === null
            ? 'Hidden'
            : formatCompactNumber(metrics.matches_today.value)
        }
      />
      <MetricCard
        label="Avg Session Length"
        lastUpdated={formatLastUpdated(lastUpdated)}
        suppressed={metrics.avg_session_length_s.suppressed}
        value={
          metrics.avg_session_length_s.suppressed || metrics.avg_session_length_s.value === null
            ? 'Hidden'
            : formatDurationSeconds(metrics.avg_session_length_s.value)
        }
      />
    </div>
  );
};
