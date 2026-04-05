import { timingSafeEqual } from 'node:crypto';

import { HttpError } from './http-error';

const toSingleHeaderValue = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

const safeCompare = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const requirePrivateBearerToken = (
  authorizationHeader: string | string[] | undefined,
  expectedToken: string
) => {
  const normalizedHeader = toSingleHeaderValue(authorizationHeader);
  if (!normalizedHeader?.startsWith('Bearer ')) {
    throw new HttpError(401, 'unauthorized', 'Valid bearer token is required');
  }

  const providedToken = normalizedHeader.slice('Bearer '.length).trim();
  if (!providedToken || !safeCompare(providedToken, expectedToken)) {
    throw new HttpError(401, 'unauthorized', 'Valid bearer token is required');
  }
};
