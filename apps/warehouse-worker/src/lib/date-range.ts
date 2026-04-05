const utcDateOnly = (value: Date) => value.toISOString().slice(0, 10);

export const enumerateCalendarDates = (start: Date, end: Date) => {
  const dates: string[] = [];
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const finalDate = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

  while (cursor <= finalDate) {
    dates.push(utcDateOnly(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

export const addUtcDays = (value: Date, days: number) => {
  const result = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

export const startOfUtcDay = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
