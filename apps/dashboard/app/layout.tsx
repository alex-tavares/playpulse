import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { NavTabs } from '../components/nav-tabs';
import {
  DASHBOARD_SESSION_COOKIE,
  verifyDashboardSessionValue,
} from '../lib/dashboard-auth';
import { readDashboardConfig } from '../lib/dashboard-config';

import './globals.css';

export const metadata: Metadata = {
  description: 'PlayPulse dashboard MVP built on the real analytics API.',
  title: 'PlayPulse Dashboard',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const config = readDashboardConfig();
  const authenticated = verifyDashboardSessionValue(
    cookies().get(DASHBOARD_SESSION_COOKIE)?.value,
    config.dashboardPrivateAccessCode
  );

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <header className="mb-8 rounded-[2rem] border border-pine/10 bg-white/75 px-6 py-5 shadow-card backdrop-blur">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-sm uppercase tracking-[0.28em] text-pine/55">PlayPulse</p>
                  <p className="font-display text-2xl font-semibold text-ink">
                    Agentic analytics for privacy-safe game telemetry.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <NavTabs />
                  {authenticated ? (
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-pine/15 bg-white px-4 py-2 text-sm text-pine/80">
                        Private access enabled
                      </span>
                      <form action="/auth/sign-out" method="post">
                        <button
                          className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white transition hover:bg-ink"
                          type="submit"
                        >
                          Sign out
                        </button>
                      </form>
                    </div>
                  ) : (
                    <Link
                      className="rounded-full bg-pine px-4 py-2 text-sm font-medium text-white transition hover:bg-ink"
                      href="/sign-in?next=/private-insights"
                    >
                      Sign in for private insights
                    </Link>
                  )}
                </div>
              </div>
            </header>
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
