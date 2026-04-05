import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import {
  DASHBOARD_SESSION_COOKIE,
  normalizeRedirectTarget,
  verifyDashboardSessionValue,
} from '../../lib/dashboard-auth';
import { readDashboardConfig } from '../../lib/dashboard-config';

export const dynamic = 'force-dynamic';

export default function SignInPage({
  searchParams,
}: {
  searchParams?: {
    error?: string;
    next?: string;
  };
}) {
  const config = readDashboardConfig();
  const nextTarget = normalizeRedirectTarget(searchParams?.next);
  const authenticated = verifyDashboardSessionValue(
    cookies().get(DASHBOARD_SESSION_COOKIE)?.value,
    config.dashboardPrivateAccessCode
  );

  if (authenticated) {
    redirect(nextTarget);
  }

  const hasError = searchParams?.error === 'invalid_code';

  return (
    <div className="mx-auto max-w-xl rounded-[2rem] border border-pine/10 bg-white/85 p-8 shadow-card backdrop-blur">
      <p className="text-sm uppercase tracking-[0.28em] text-pine/55">Private Access</p>
      <h1 className="mt-4 font-display text-4xl font-semibold text-ink">
        Unlock the retention dashboard.
      </h1>
      <p className="mt-4 text-lg leading-8 text-pine/80">
        This demo gate is intentionally lightweight: it grants an HttpOnly dashboard session while the real analytics bearer token remains server-side.
      </p>
      {hasError ? (
        <div className="mt-6 rounded-xl border border-signal/20 bg-signal/5 px-4 py-3 text-sm text-signal">
          The access code did not match the configured demo gate.
        </div>
      ) : null}
      <form action="/auth/sign-in" className="mt-8 space-y-5" method="post">
        <input name="next" type="hidden" value={nextTarget} />
        <div className="space-y-2">
          <label className="block text-sm font-medium text-ink" htmlFor="access_code">
            Demo access code
          </label>
          <input
            className="w-full rounded-xl border border-pine/20 bg-canvas px-4 py-3 outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/10"
            id="access_code"
            name="access_code"
            placeholder="playpulse-demo-access"
            required
            type="password"
          />
        </div>
        <button
          className="rounded-full bg-pine px-5 py-3 text-sm font-medium text-white transition hover:bg-ink"
          type="submit"
        >
          Enter private insights
        </button>
      </form>
    </div>
  );
}
