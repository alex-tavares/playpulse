import {
  analyticsQueryGameIdSchema,
  customEventNameSchema,
  type AnalyticsQueryGameId,
} from '@playpulse/schemas';
import { z } from 'zod';

import { HttpError } from './http-error';

const days7Schema = z.coerce.number().int().refine((value) => value === 7 || value === 14, {
  message: 'days must be 7 or 14',
});
const days30Schema = z.coerce.number().int().refine((value) => value === 7 || value === 14 || value === 30, {
  message: 'days must be 7, 14, or 30',
});
const weeksSchema = z.coerce.number().int().min(1).max(8);
const customEventDaysSchema = z.coerce.number().int().min(1).max(30);
const customEventLimitSchema = z.coerce.number().int().min(1).max(100);

const formatValidationDetails = (issues: Array<{ message: string; path: (string | number)[] }>) =>
  issues.map((issue) => ({
    message: issue.message,
    path: issue.path.join('.'),
  }));

const parseOrThrow = <T>(schema: z.ZodType<T>, payload: unknown, message: string) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new HttpError(400, 'validation_failed', message, {
      details: formatValidationDetails(result.error.issues),
    });
  }

  return result.data;
};

export const parseGameIdQuery = (value: unknown): AnalyticsQueryGameId =>
  parseOrThrow(
    analyticsQueryGameIdSchema.default('all'),
    value ?? 'all',
    'Query parameters did not match the expected schema'
  ) as AnalyticsQueryGameId;

export const parseSessionsDaysQuery = (value: unknown): 7 | 14 | 30 =>
  parseOrThrow(
    days30Schema.default(14),
    value ?? 14,
    'Query parameters did not match the expected schema'
  ) as 7 | 14 | 30;

export const parsePopularityDaysQuery = (value: unknown): 7 | 14 =>
  parseOrThrow(
    days7Schema.default(7),
    value ?? 7,
    'Query parameters did not match the expected schema'
  ) as 7 | 14;

export const parseRetentionWeeksQuery = (value: unknown): number =>
  parseOrThrow(
    weeksSchema.default(8),
    value ?? 8,
    'Query parameters did not match the expected schema'
  ) as number;

export const parseCustomEventDaysQuery = (value: unknown, defaultDays: number): number =>
  parseOrThrow(
    customEventDaysSchema.default(defaultDays),
    value ?? defaultDays,
    'Query parameters did not match the expected schema'
  ) as number;

export const parseCustomEventLimitQuery = (value: unknown): number =>
  parseOrThrow(
    customEventLimitSchema.default(25),
    value ?? 25,
    'Query parameters did not match the expected schema'
  ) as number;

export const parseCustomEventNameQuery = (value: unknown): string =>
  parseOrThrow(
    customEventNameSchema,
    value,
    'Query parameters did not match the expected schema'
  );
