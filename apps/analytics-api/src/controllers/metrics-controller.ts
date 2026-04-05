import type { RequestHandler } from 'express';
import {
  analyticsCharacterPopularityResponseSchema,
  analyticsRetentionCohortsResponseSchema,
  analyticsSessionsDailyResponseSchema,
  analyticsSummaryResponseSchema,
} from '@playpulse/schemas';

import type { AnalyticsConfig } from '../config/analytics-config';
import { HttpError } from '../lib/http-error';
import { requirePrivateBearerToken } from '../lib/private-auth';
import { parseGameIdQuery, parsePopularityDaysQuery, parseRetentionWeeksQuery, parseSessionsDaysQuery } from '../lib/query';
import type { AnalyticsResponseLocals } from '../lib/request-context';
import { AnalyticsMetricsService } from '../services/analytics-metrics-service';

interface MetricsControllerDependencies {
  analyticsConfig: Pick<AnalyticsConfig, 'analyticsPrivateBearerToken'>;
  analyticsMetricsService: AnalyticsMetricsService;
}

export const createSummaryController = ({
  analyticsMetricsService,
}: MetricsControllerDependencies): RequestHandler<never, unknown, unknown, { game_id?: string }, AnalyticsResponseLocals> =>
  async (request, response, next) => {
    try {
      const gameId = parseGameIdQuery(request.query.game_id);
      const data = await analyticsMetricsService.getSummary(gameId, 'public');
      const payload = analyticsSummaryResponseSchema.parse({
        data,
        request_id: response.locals.context.requestId,
      });

      response.status(200).json(payload);
    } catch (error) {
      response.locals.context.errorCode =
        error instanceof HttpError ? error.code : response.locals.context.errorCode;
      next(error);
    }
  };

export const createSessionsDailyController = ({
  analyticsMetricsService,
}: MetricsControllerDependencies): RequestHandler<
  never,
  unknown,
  unknown,
  { days?: string; game_id?: string },
  AnalyticsResponseLocals
> => async (request, response, next) => {
  try {
    const gameId = parseGameIdQuery(request.query.game_id);
    const days = parseSessionsDaysQuery(request.query.days) as 7 | 14 | 30;
    const data = await analyticsMetricsService.getSessionsDaily(gameId, days, 'public');
    const payload = analyticsSessionsDailyResponseSchema.parse({
      data,
      request_id: response.locals.context.requestId,
    });

    response.status(200).json(payload);
  } catch (error) {
    response.locals.context.errorCode =
      error instanceof HttpError ? error.code : response.locals.context.errorCode;
    next(error);
  }
};

export const createCharacterPopularityController = ({
  analyticsMetricsService,
}: MetricsControllerDependencies): RequestHandler<
  never,
  unknown,
  unknown,
  { days?: string; game_id?: string },
  AnalyticsResponseLocals
> => async (request, response, next) => {
  try {
    const gameId = parseGameIdQuery(request.query.game_id);
    const days = parsePopularityDaysQuery(request.query.days) as 7 | 14;
    const data = await analyticsMetricsService.getCharacterPopularity(gameId, days, 'public');
    const payload = analyticsCharacterPopularityResponseSchema.parse({
      data,
      request_id: response.locals.context.requestId,
    });

    response.status(200).json(payload);
  } catch (error) {
    response.locals.context.errorCode =
      error instanceof HttpError ? error.code : response.locals.context.errorCode;
    next(error);
  }
};

export const createRetentionCohortsController = ({
  analyticsConfig,
  analyticsMetricsService,
}: MetricsControllerDependencies): RequestHandler<
  never,
  unknown,
  unknown,
  { game_id?: string; weeks?: string },
  AnalyticsResponseLocals
> => async (request, response, next) => {
  try {
    requirePrivateBearerToken(
      request.headers.authorization,
      analyticsConfig.analyticsPrivateBearerToken
    );

    const gameId = parseGameIdQuery(request.query.game_id);
    const weeks = parseRetentionWeeksQuery(request.query.weeks);
    const data = await analyticsMetricsService.getRetentionCohorts(gameId, weeks);
    const payload = analyticsRetentionCohortsResponseSchema.parse({
      data,
      request_id: response.locals.context.requestId,
    });

    response.status(200).json(payload);
  } catch (error) {
    response.locals.context.errorCode =
      error instanceof HttpError ? error.code : response.locals.context.errorCode;
    next(error);
  }
};
