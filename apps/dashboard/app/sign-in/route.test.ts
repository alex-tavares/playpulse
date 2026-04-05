import { describe, expect, it } from 'vitest';

import { DASHBOARD_SESSION_COOKIE } from '../../lib/dashboard-auth';
import { POST } from '../auth/sign-in/route';

describe('sign-in route', () => {
  it('sets the dashboard session cookie when the configured access code matches', async () => {
    process.env.PLAYPULSE_DASHBOARD_PRIVATE_ACCESS_CODE = 'demo-code';

    const formData = new FormData();
    formData.set('access_code', 'demo-code');
    formData.set('next', '/private-insights');

    const response = await POST(
      new Request('http://localhost:3000/sign-in', {
        body: formData,
        method: 'POST',
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('http://localhost:3000/private-insights');
    expect(response.headers.get('set-cookie')).toContain(DASHBOARD_SESSION_COOKIE);
  });

  it('redirects back to sign-in when the access code is invalid', async () => {
    process.env.PLAYPULSE_DASHBOARD_PRIVATE_ACCESS_CODE = 'demo-code';

    const formData = new FormData();
    formData.set('access_code', 'wrong-code');
    formData.set('next', '/private-insights');

    const response = await POST(
      new Request('http://localhost:3000/sign-in', {
        body: formData,
        method: 'POST',
      })
    );

    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/sign-in?error=invalid_code&next=%2Fprivate-insights'
    );
  });
});
