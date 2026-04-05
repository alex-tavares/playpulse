import React from 'react';
import type {
  AnalyticsCharacterPopularityResponse,
  AnalyticsSessionsDailyResponse,
  AnalyticsSummaryResponse,
} from '@playpulse/schemas';

import type { AnalyticsFetchResult } from '../lib/analytics-client';
import { formatLastUpdated } from '../lib/format';
import {
  shouldRenderPopularityEmptyState,
  shouldRenderSuppressedTimeseriesEmptyState,
} from '../lib/view-models';

import { CharacterPopularityChart } from './character-popularity-chart';
import { ChartCard, CardEmptyState, CardErrorState } from './chart-card';
import { MetricSummaryStrip } from './metric-summary-strip';
import { SegmentedLinks } from './segmented-links';
import { SessionsChart } from './sessions-chart';

interface PublicMetricsViewProps {
  popularityDays: 7 | 14;
  popularityResult: AnalyticsFetchResult<AnalyticsCharacterPopularityResponse>;
  sessionsDays: 7 | 14;
  sessionsResult: AnalyticsFetchResult<AnalyticsSessionsDailyResponse>;
  summaryResult: AnalyticsFetchResult<AnalyticsSummaryResponse>;
}

const sessionsFooter = (result: AnalyticsFetchResult<AnalyticsSessionsDailyResponse>) =>
  result.status === 'success'
    ? `Updated ${formatLastUpdated(result.data.data.last_updated)}. Hidden markers indicate anonymized days with fewer than 10 players.`
    : 'Data refreshed every 15 minutes when the local demo stack is running.';

const popularityFooter = (result: AnalyticsFetchResult<AnalyticsCharacterPopularityResponse>) =>
  result.status === 'success'
    ? `Updated ${formatLastUpdated(result.data.data.last_updated)}. Buckets with fewer than 10 players merge into Other.`
    : 'Data refreshed every 15 minutes when the local demo stack is running.';

export const PublicMetricsView = ({
  popularityDays,
  popularityResult,
  sessionsDays,
  sessionsResult,
  summaryResult,
}: PublicMetricsViewProps) => (
  <div className="space-y-8">
    <section className="space-y-3">
      <p className="text-sm uppercase tracking-[0.24em] text-pine/60">Public Metrics</p>
      <h1 className="font-display text-4xl font-semibold text-ink md:text-5xl">
        Privacy-first telemetry for MythClash and MythTag.
      </h1>
      <p className="max-w-3xl text-lg leading-8 text-pine/80">
        This public view aggregates seeded game data through the real PlayPulse analytics API. Values are hidden or merged whenever a bucket falls below the k-anonymity floor.
      </p>
    </section>

    <MetricSummaryStrip result={summaryResult} />

    <section className="grid gap-6 xl:grid-cols-2">
      <ChartCard
        controls={
          <SegmentedLinks
            activeKey={String(sessionsDays)}
            options={[
              { href: `/?sessions_days=7&popularity_days=${popularityDays}`, key: '7', label: '7d' },
              { href: `/?sessions_days=14&popularity_days=${popularityDays}`, key: '14', label: '14d' },
            ]}
          />
        }
        footer={sessionsFooter(sessionsResult)}
        title="Sessions per Day"
      >
        {sessionsResult.status === 'success' ? (
          shouldRenderSuppressedTimeseriesEmptyState(sessionsResult.data.data.points) ? (
            <CardEmptyState
              message="Not enough anonymized data yet. Try widening the date range."
              title="Sessions data is still too sparse"
            />
          ) : (
            <SessionsChart data={sessionsResult.data.data} />
          )
        ) : (
          <CardErrorState
            message={sessionsResult.message}
            requestId={sessionsResult.requestId}
            retryHref={`/?sessions_days=${sessionsDays}&popularity_days=${popularityDays}`}
            title="Unable to load sessions"
          />
        )}
      </ChartCard>

      <ChartCard
        controls={
          <SegmentedLinks
            activeKey={String(popularityDays)}
            options={[
              { href: `/?sessions_days=${sessionsDays}&popularity_days=7`, key: '7', label: '7d' },
              { href: `/?sessions_days=${sessionsDays}&popularity_days=14`, key: '14', label: '14d' },
            ]}
          />
        }
        footer={popularityFooter(popularityResult)}
        title="Character Popularity"
      >
        {popularityResult.status === 'success' ? (
          shouldRenderPopularityEmptyState(popularityResult.data.data.characters) ? (
            <CardEmptyState
              message="Not enough anonymized data yet. Try widening the date range."
              title="Character picks are fully anonymized right now"
            />
          ) : (
            <CharacterPopularityChart data={popularityResult.data.data} />
          )
        ) : (
          <CardErrorState
            message={popularityResult.message}
            requestId={popularityResult.requestId}
            retryHref={`/?sessions_days=${sessionsDays}&popularity_days=${popularityDays}`}
            title="Unable to load character popularity"
          />
        )}
      </ChartCard>
    </section>

    <footer className="rounded-xl border border-pine/10 bg-white/70 px-5 py-4 text-sm text-pine/80">
      Data refreshed within 15 minutes. Buckets with fewer than 10 players are merged or hidden.
    </footer>
  </div>
);
