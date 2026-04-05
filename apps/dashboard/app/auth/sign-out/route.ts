import { NextResponse } from 'next/server';

import { DASHBOARD_SESSION_COOKIE } from '../../../lib/dashboard-auth';

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL('/', request.url), { status: 303 });
  response.cookies.set({
    expires: new Date(0),
    httpOnly: true,
    name: DASHBOARD_SESSION_COOKIE,
    path: '/',
    sameSite: 'lax',
    value: '',
  });

  return response;
}
