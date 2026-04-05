import { NextResponse } from 'next/server';

import {
  DASHBOARD_SESSION_COOKIE,
  createDashboardSessionValue,
  normalizeRedirectTarget,
} from '../../../lib/dashboard-auth';
import { readDashboardConfig } from '../../../lib/dashboard-config';

export async function POST(request: Request) {
  const formData = await request.formData();
  const accessCode = String(formData.get('access_code') ?? '');
  const nextTarget = normalizeRedirectTarget(String(formData.get('next') ?? '/private-insights'));
  const config = readDashboardConfig();

  if (accessCode !== config.dashboardPrivateAccessCode) {
    return NextResponse.redirect(
      new URL(`/sign-in?error=invalid_code&next=${encodeURIComponent(nextTarget)}`, request.url),
      { status: 303 }
    );
  }

  const response = NextResponse.redirect(new URL(nextTarget, request.url), { status: 303 });
  response.cookies.set({
    httpOnly: true,
    name: DASHBOARD_SESSION_COOKIE,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    value: createDashboardSessionValue(config.dashboardPrivateAccessCode),
  });

  return response;
}
