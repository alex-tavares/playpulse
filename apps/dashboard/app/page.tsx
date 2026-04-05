import { PublicMetricsView } from '../components/public-metrics-view';
import {
  fetchCharacterPopularity,
  fetchSessionsDaily,
  fetchSummaryMetrics,
} from '../lib/analytics-client';
import { readDashboardConfig } from '../lib/dashboard-config';

const parseSessionsDays = (value?: string) => (value === '7' ? 7 : 14);
const parsePopularityDays = (value?: string) => (value === '14' ? 14 : 7);

export const dynamic = 'force-dynamic';

export default async function PublicMetricsPage({
  searchParams,
}: {
  searchParams?: {
    popularity_days?: string;
    sessions_days?: string;
  };
}) {
  const config = readDashboardConfig();
  const sessionsDays = parseSessionsDays(searchParams?.sessions_days);
  const popularityDays = parsePopularityDays(searchParams?.popularity_days);

  const [summaryResult, sessionsResult, popularityResult] = await Promise.all([
    fetchSummaryMetrics(config, 'all'),
    fetchSessionsDaily(config, 'all', sessionsDays),
    fetchCharacterPopularity(config, 'all', popularityDays),
  ]);

  return (
    <PublicMetricsView
      popularityDays={popularityDays}
      popularityResult={popularityResult}
      sessionsDays={sessionsDays}
      sessionsResult={sessionsResult}
      summaryResult={summaryResult}
    />
  );
}
