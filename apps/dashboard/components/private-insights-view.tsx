import React from 'react';
import type { AnalyticsQueryGameId, AnalyticsRetentionCohortsResponse } from '@playpulse/schemas';

import type { AnalyticsFetchResult } from '../lib/analytics-client';
import { formatLastUpdated } from '../lib/format';

import { ChartCard, CardEmptyState, CardErrorState } from './chart-card';
import { RetentionCohortsChart } from './retention-cohorts-chart';
import { SegmentedLinks } from './segmented-links';

interface PrivateInsightsViewProps {
  gameId: AnalyticsQueryGameId;
  retentionResult: AnalyticsFetchResult<AnalyticsRetentionCohortsResponse>;
  weeks: number;
}

const ComingSoonCard = ({ title }: { title: string }) => (
  <article className="rounded-xl border border-dashed border-pine/20 bg-canvas/50 px-5 py-6 text-pine/70">
    <p className="font-display text-lg font-semibold text-ink">{title}</p>
    <p className="mt-2 text-sm">Reserved for the next private-insights slices after MVP.</p>
  </article>
);

export const PrivateInsightsView = ({
  gameId,
  retentionResult,
  weeks,
}: PrivateInsightsViewProps) => (
  <div className="space-y-8">
    <section className="space-y-3">
      <p className="text-sm uppercase tracking-[0.24em] text-pine/60">Private Insights</p>
      <h1 className="font-display text-4xl font-semibold text-ink md:text-5xl">
        Retention, safely exposed behind a server-only dashboard gate.
      </h1>
      <p className="max-w-3xl text-lg leading-8 text-pine/80">
        This view keeps the analytics bearer token on the server and only exposes anonymized retention outputs to signed-in viewers.
      </p>
    </section>

    <ChartCard
      controls={
        <div className="flex flex-col gap-2 sm:items-end">
          <SegmentedLinks
            activeKey={gameId}
            options={[
              { href: `/private-insights?game_id=all&weeks=${weeks}`, key: 'all', label: 'All' },
              {
                href: `/private-insights?game_id=mythclash&weeks=${weeks}`,
                key: 'mythclash',
                label: 'MythClash',
              },
              {
                href: `/private-insights?game_id=mythtag&weeks=${weeks}`,
                key: 'mythtag',
                label: 'MythTag',
              },
            ]}
          />
          <SegmentedLinks
            activeKey={String(weeks)}
            options={[
              { href: `/private-insights?game_id=${gameId}&weeks=4`, key: '4', label: '4w' },
              { href: `/private-insights?game_id=${gameId}&weeks=8`, key: '8', label: '8w' },
            ]}
          />
        </div>
      }
      footer={
        retentionResult.status === 'success'
          ? `Updated ${formatLastUpdated(retentionResult.data.data.last_updated)}. Counts under 10 remain masked while percentages stay visible.`
          : 'Retention refresh runs nightly in the local warehouse worker.'
      }
      title="Retention Cohorts (D1 / D7)"
    >
      {retentionResult.status === 'success' ? (
        retentionResult.data.data.cohorts.length === 0 ? (
          <CardEmptyState
            message="Not enough anonymized data yet. Try switching games or widening the cohort window."
            title="No retention cohorts are available"
          />
        ) : (
          <RetentionCohortsChart data={retentionResult.data.data} />
        )
      ) : (
        <CardErrorState
          message={retentionResult.message}
          requestId={retentionResult.requestId}
          retryHref={`/private-insights?game_id=${gameId}&weeks=${weeks}`}
          title="Unable to load retention"
        />
      )}
    </ChartCard>

    <section className="grid gap-4 lg:grid-cols-2">
      <ComingSoonCard title="Monetization Signals" />
      <ComingSoonCard title="Session Funnel Health" />
    </section>

    <footer className="rounded-xl border border-pine/10 bg-white/70 px-5 py-4 text-sm text-pine/80">
      Data refreshed within 15 minutes for rolling metrics and nightly for retention cohorts. Buckets with fewer than 10 players stay hidden or merged.
    </footer>
  </div>
);
