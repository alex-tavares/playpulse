export const startOfUtcDay = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export const addUtcDays = (value: Date, days: number) => {
  const result = startOfUtcDay(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export const startOfUtcWeek = (value: Date) => {
  const day = startOfUtcDay(value);
  const weekday = day.getUTCDay();
  const daysSinceMonday = (weekday + 6) % 7;

  return addUtcDays(day, -daysSinceMonday);
};

export const toDateKey = (value: Date) => value.toISOString().slice(0, 10);

export const roundRatio = (numerator: number, denominator: number) => {
  if (denominator === 0) {
    return 0;
  }

  return Number((numerator / denominator).toFixed(4));
};
