import { addUtcDays, startOfUtcDay } from './date-range';

export interface SessionStartFact {
  gameId: string;
  occurredAt: Date;
  playerIdHash: string;
}

export interface DerivedRetentionCohort {
  cohortDate: Date;
  gameId: string;
  cohortSize: number;
  d1Retained: number;
  d7Retained: number;
  d1RetentionPct: number;
  d7RetentionPct: number;
  d1Suppressed: boolean;
  d7Suppressed: boolean;
  lastRefreshedAt: Date;
}

const toDateKey = (value: Date) => startOfUtcDay(value).toISOString().slice(0, 10);

const roundRatio = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(4));
};

export const deriveRetentionCohorts = (
  sessionStarts: SessionStartFact[],
  refreshedAt: Date
): DerivedRetentionCohort[] => {
  const playerFirstSessions = new Map<string, string>();
  const playerSessionDates = new Map<string, Set<string>>();

  for (const fact of sessionStarts) {
    const playerKey = `${fact.gameId}:${fact.playerIdHash}`;
    const dateKey = toDateKey(fact.occurredAt);
    const knownFirstDate = playerFirstSessions.get(playerKey);

    if (!knownFirstDate || dateKey < knownFirstDate) {
      playerFirstSessions.set(playerKey, dateKey);
    }

    const sessionDates = playerSessionDates.get(playerKey) ?? new Set<string>();
    sessionDates.add(dateKey);
    playerSessionDates.set(playerKey, sessionDates);
  }

  const cohorts = new Map<
    string,
    {
      cohortDate: string;
      d1Retained: number;
      d7Retained: number;
      gameId: string;
      playerCount: number;
    }
  >();

  for (const [playerKey, firstDate] of playerFirstSessions.entries()) {
    const [gameId] = playerKey.split(':');
    const cohortKey = `${gameId}:${firstDate}`;
    const cohort = cohorts.get(cohortKey) ?? {
      cohortDate: firstDate,
      d1Retained: 0,
      d7Retained: 0,
      gameId,
      playerCount: 0,
    };

    cohort.playerCount += 1;

    const sessionDates = playerSessionDates.get(playerKey) ?? new Set<string>();
    const baseDate = new Date(`${firstDate}T00:00:00.000Z`);
    const d1Date = toDateKey(addUtcDays(baseDate, 1));
    const d7Date = toDateKey(addUtcDays(baseDate, 7));

    if (sessionDates.has(d1Date)) {
      cohort.d1Retained += 1;
    }

    if (sessionDates.has(d7Date)) {
      cohort.d7Retained += 1;
    }

    cohorts.set(cohortKey, cohort);
  }

  return [...cohorts.values()]
    .sort((left, right) => left.cohortDate.localeCompare(right.cohortDate) || left.gameId.localeCompare(right.gameId))
    .map((cohort) => ({
      cohortDate: new Date(`${cohort.cohortDate}T00:00:00.000Z`),
      cohortSize: cohort.playerCount,
      d1Retained: cohort.d1Retained,
      d7Retained: cohort.d7Retained,
      d1RetentionPct: roundRatio(cohort.d1Retained, cohort.playerCount),
      d7RetentionPct: roundRatio(cohort.d7Retained, cohort.playerCount),
      d1Suppressed: cohort.d1Retained > 0 && cohort.d1Retained < 10,
      d7Suppressed: cohort.d7Retained > 0 && cohort.d7Retained < 10,
      gameId: cohort.gameId,
      lastRefreshedAt: refreshedAt,
    }));
};
