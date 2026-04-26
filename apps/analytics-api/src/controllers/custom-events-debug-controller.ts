import type { RequestHandler } from 'express';
import {
  customEventCountsResponseSchema,
  customEventNamesResponseSchema,
  customEventRecentResponseSchema,
} from '@playpulse/schemas';

import type { AnalyticsConfig } from '../config/analytics-config';
import { HttpError } from '../lib/http-error';
import { requirePrivateBearerToken } from '../lib/private-auth';
import {
  parseCustomEventDaysQuery,
  parseCustomEventLimitQuery,
  parseCustomEventNameQuery,
  parseGameIdQuery,
} from '../lib/query';
import type { AnalyticsResponseLocals } from '../lib/request-context';
import { CustomEventsDebugService } from '../services/custom-events-debug-service';

interface CustomEventsDebugControllerDependencies {
  analyticsConfig: Pick<AnalyticsConfig, 'analyticsPrivateBearerToken'>;
  customEventsDebugService: CustomEventsDebugService;
}

type NamesQuery = {
  days?: string;
  game_id?: string;
};

type CountsQuery = {
  days?: string;
  event_name?: string;
  game_id?: string;
};

type RecentQuery = {
  event_name?: string;
  game_id?: string;
  limit?: string;
};

const requireDebugAuth = (
  authorization: string | string[] | undefined,
  analyticsConfig: Pick<AnalyticsConfig, 'analyticsPrivateBearerToken'>
) => requirePrivateBearerToken(authorization, analyticsConfig.analyticsPrivateBearerToken);

export const createCustomEventNamesController = ({
  analyticsConfig,
  customEventsDebugService,
}: CustomEventsDebugControllerDependencies): RequestHandler<
  never,
  unknown,
  unknown,
  NamesQuery,
  AnalyticsResponseLocals
> => async (request, response, next) => {
  try {
    requireDebugAuth(request.headers.authorization, analyticsConfig);

    const gameId = parseGameIdQuery(request.query.game_id);
    const days = parseCustomEventDaysQuery(request.query.days, 7);
    const data = await customEventsDebugService.getNames(gameId, days);
    const payload = customEventNamesResponseSchema.parse({
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

export const createCustomEventCountsController = ({
  analyticsConfig,
  customEventsDebugService,
}: CustomEventsDebugControllerDependencies): RequestHandler<
  never,
  unknown,
  unknown,
  CountsQuery,
  AnalyticsResponseLocals
> => async (request, response, next) => {
  try {
    requireDebugAuth(request.headers.authorization, analyticsConfig);

    const gameId = parseGameIdQuery(request.query.game_id);
    const days = parseCustomEventDaysQuery(request.query.days, 14);
    const eventName = parseCustomEventNameQuery(request.query.event_name);
    const data = await customEventsDebugService.getCounts(gameId, eventName, days);
    const payload = customEventCountsResponseSchema.parse({
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

export const createCustomEventRecentController = ({
  analyticsConfig,
  customEventsDebugService,
}: CustomEventsDebugControllerDependencies): RequestHandler<
  never,
  unknown,
  unknown,
  RecentQuery,
  AnalyticsResponseLocals
> => async (request, response, next) => {
  try {
    requireDebugAuth(request.headers.authorization, analyticsConfig);

    const gameId = parseGameIdQuery(request.query.game_id);
    const eventName = parseCustomEventNameQuery(request.query.event_name);
    const limit = parseCustomEventLimitQuery(request.query.limit);
    const data = await customEventsDebugService.getRecent(gameId, eventName, limit);
    const payload = customEventRecentResponseSchema.parse({
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
