'use client';

import React from 'react';
import type { AnalyticsSessionsDailyResponse } from '@playpulse/schemas';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { formatDurationSeconds } from '../lib/format';

interface SessionsChartProps {
  data: AnalyticsSessionsDailyResponse['data'];
}

export const SessionsChart = ({ data }: SessionsChartProps) => (
  <div className="space-y-4" data-testid="sessions-chart">
    <div className="overflow-x-auto">
      <LineChart data={data.points} height={280} width={640}>
        <CartesianGrid stroke="rgba(31, 75, 54, 0.12)" strokeDasharray="3 3" />
        <XAxis dataKey="metric_date" stroke="#4d7c5e" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} stroke="#4d7c5e" tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#132a1f',
            border: 'none',
            borderRadius: '16px',
            color: '#f7f3e9',
          }}
          formatter={(value: unknown, name: string, entry) => {
            if (entry.payload.suppressed) {
              return ['Hidden to protect player privacy', 'Sessions'];
            }

            const numericValue = typeof value === 'number' ? value : 0;

            if (name === 'avg_session_length_s') {
              return [formatDurationSeconds(numericValue), 'Avg session length'];
            }

            return [numericValue, name === 'session_count' ? 'Sessions' : 'Value'];
          }}
        />
        <Line
          connectNulls={false}
          dataKey="session_count"
          dot={false}
          stroke="#1f4b36"
          strokeWidth={3}
          type="monotone"
        />
        {data.points
          .filter((point) => point.suppressed)
          .map((point) => (
            <ReferenceDot
              key={point.metric_date}
              fill="#f7f3e9"
              isFront
              r={6}
              stroke="#c86532"
              strokeDasharray="4 3"
              strokeWidth={2}
              x={point.metric_date}
              y={0}
            />
          ))}
      </LineChart>
    </div>
    <div className="flex flex-wrap gap-2 text-xs text-pine/75">
      {data.points.some((point) => point.suppressed) ? (
        data.points
          .filter((point) => point.suppressed)
          .map((point) => (
            <span
              key={point.metric_date}
              className="rounded-full border border-signal/20 bg-signal/5 px-3 py-1"
            >
              Hidden {point.metric_date}
            </span>
          ))
      ) : (
        <span className="rounded-full border border-pine/15 bg-canvas px-3 py-1">
          All points are visible for the selected range.
        </span>
      )}
    </div>
  </div>
);
