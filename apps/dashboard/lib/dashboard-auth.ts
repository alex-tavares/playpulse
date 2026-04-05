import { createHmac, timingSafeEqual } from 'node:crypto';

import { redirect } from 'next/navigation';

export const DASHBOARD_SESSION_COOKIE = 'playpulse_private_session';

const base64UrlEncode = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const base64UrlDecode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const createSignature = (payload: string, accessCode: string) =>
  createHmac('sha256', accessCode).update(payload).digest('base64url');

const safeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

export const createDashboardSessionValue = (accessCode: string) => {
  const payload = base64UrlEncode(
    JSON.stringify({
      iat: Date.now(),
      scope: 'private-insights',
      version: 1,
    })
  );

  return `${payload}.${createSignature(payload, accessCode)}`;
};

export const verifyDashboardSessionValue = (
  sessionValue: string | undefined,
  accessCode: string
) => {
  if (!sessionValue) {
    return false;
  }

  const [payload, signature] = sessionValue.split('.');

  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = createSignature(payload, accessCode);
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as {
      iat?: number;
      scope?: string;
      version?: number;
    };

    return (
      parsed.scope === 'private-insights' &&
      parsed.version === 1 &&
      typeof parsed.iat === 'number' &&
      Number.isFinite(parsed.iat)
    );
  } catch {
    return false;
  }
};

export const normalizeRedirectTarget = (target: string | null | undefined) => {
  if (!target || !target.startsWith('/') || target.startsWith('//')) {
    return '/private-insights';
  }

  return target;
};

export const requireDashboardSession = (
  sessionValue: string | undefined,
  accessCode: string,
  target = '/private-insights'
) => {
  if (!verifyDashboardSessionValue(sessionValue, accessCode)) {
    redirect(`/sign-in?next=${encodeURIComponent(normalizeRedirectTarget(target))}`);
  }
};
