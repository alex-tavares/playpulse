'use client';

import React from 'react';
import type { AnalyticsRetentionCohortsResponse } from '@playpulse/schemas';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import { formatPercentage } from '../lib/format';

interface RetentionCohortsChartProps {
  data: AnalyticsRetentionCohortsResponse['data'];
}

export const RetentionCohortsChart = ({ data }: RetentionCohortsChartProps) => (
  <div className="space-y-5" data-testid="retention-chart">
    <div className="overflow-x-auto">
      <BarChart data={data.cohorts} height={280} width={680}>
        <CartesianGrid stroke="rgba(31, 75, 54, 0.12)" strokeDasharray="3 3" />
        <XAxis dataKey="cohort_date" stroke="#4d7c5e" tick={{ fontSize: 12 }} />
        <YAxis domain={[0, 1]} stroke="#4d7c5e" tickFormatter={formatPercentage} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#132a1f',
            border: 'none',
            borderRadius: '16px',
            color: '#f7f3e9',
          }}
          formatter={(value: number, name: string) => [
            formatPercentage(value),
            name === 'd1_retention_pct' ? 'D1 retention' : 'D7 retention',
          ]}
        />
        <Bar dataKey="d1_retention_pct" fill="#1f4b36" radius={[8, 8, 0, 0]} />
        <Bar dataKey="d7_retention_pct" fill="#c86532" radius={[8, 8, 0, 0]} />
      </BarChart>
    </div>
    <div className="grid gap-3">
      {data.cohorts.map((cohort) => (
        <article
          key={cohort.cohort_date}
          className="grid gap-2 rounded-xl border border-pine/10 bg-canvas/70 px-4 py-3 text-sm text-pine/80 sm:grid-cols-[1.2fr_1fr_1fr]"
        >
          <div>
            <p className="font-display text-base font-semibold text-ink">{cohort.cohort_date}</p>
            <p>Cohort size {cohort.cohort_size}</p>
          </div>
          <div>
            <p className="font-medium text-ink">D1 {formatPercentage(cohort.d1_retention_pct)}</p>
            <p>{cohort.d1_suppressed ? '<10 players' : `${cohort.d1_retained ?? 0} players`}</p>
          </div>
          <div>
            <p className="font-medium text-ink">D7 {formatPercentage(cohort.d7_retention_pct)}</p>
            <p>{cohort.d7_suppressed ? '<10 players' : `${cohort.d7_retained ?? 0} players`}</p>
          </div>
        </article>
      ))}
    </div>
  </div>
);
