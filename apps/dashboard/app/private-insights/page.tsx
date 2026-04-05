import { cookies } from 'next/headers';

import { PrivateInsightsView } from '../../components/private-insights-view';
import { fetchRetentionCohorts } from '../../lib/analytics-client';
import {
  DASHBOARD_SESSION_COOKIE,
  requireDashboardSession,
} from '../../lib/dashboard-auth';
import { readDashboardConfig } from '../../lib/dashboard-config';

const parseGameId = (value?: string) => {
  if (value === 'mythclash' || value === 'mythtag' || value === 'all') {
    return value;
  }

  return 'all';
};

const parseWeeks = (value?: string) => {
  if (value === '4') {
    return 4;
  }

  return 8;
};

export const dynamic = 'force-dynamic';

export default async function PrivateInsightsPage({
  searchParams,
}: {
  searchParams?: {
    game_id?: string;
    weeks?: string;
  };
}) {
  const config = readDashboardConfig();
  requireDashboardSession(
    cookies().get(DASHBOARD_SESSION_COOKIE)?.value,
    config.dashboardPrivateAccessCode,
    '/private-insights'
  );

  const gameId = parseGameId(searchParams?.game_id);
  const weeks = parseWeeks(searchParams?.weeks);
  const retentionResult = await fetchRetentionCohorts(config, gameId, weeks);

  return <PrivateInsightsView gameId={gameId} retentionResult={retentionResult} weeks={weeks} />;
}
