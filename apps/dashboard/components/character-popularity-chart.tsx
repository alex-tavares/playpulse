'use client';

import React from 'react';
import type { AnalyticsCharacterPopularityResponse } from '@playpulse/schemas';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';

import { formatPercentage } from '../lib/format';

interface CharacterPopularityChartProps {
  data: AnalyticsCharacterPopularityResponse['data'];
}

export const CharacterPopularityChart = ({ data }: CharacterPopularityChartProps) => (
  <div className="space-y-4" data-testid="character-popularity-chart">
    <div className="overflow-x-auto">
      <BarChart data={data.characters} height={280} layout="vertical" width={640}>
        <CartesianGrid stroke="rgba(31, 75, 54, 0.12)" strokeDasharray="3 3" />
        <XAxis domain={[0, 1]} stroke="#4d7c5e" tickFormatter={formatPercentage} type="number" />
        <YAxis dataKey="character_id" stroke="#4d7c5e" type="category" width={110} />
        <Tooltip
          contentStyle={{
            backgroundColor: '#132a1f',
            border: 'none',
            borderRadius: '16px',
            color: '#f7f3e9',
          }}
          formatter={(value: number, name: string, entry) => {
            if (name === 'pick_ratio') {
              return [formatPercentage(value), 'Pick rate'];
            }

            if (entry.payload.suppressed) {
              return ['Merged to protect player privacy', 'Selections'];
            }

            return [value, 'Selections'];
          }}
        />
        <Bar dataKey="pick_ratio" fill="#4d7c5e" radius={[0, 8, 8, 0]} />
      </BarChart>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {data.characters.map((character) => (
        <div
          key={character.character_id}
          className="rounded-xl border border-pine/10 bg-canvas/60 px-3 py-2 text-sm text-pine/80"
        >
          <p className="font-medium text-ink">{character.character_id}</p>
          <p>{formatPercentage(character.pick_ratio)}</p>
          <p>
            {character.suppressed
              ? 'Merged to protect player privacy'
              : `${character.pick_count ?? 0} selections`}
          </p>
        </div>
      ))}
    </div>
  </div>
);
