import { pathToFileURL } from 'node:url';

const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const readConfig = (env) => ({
  analyticsBaseUrl: trimTrailingSlash(
    env.PLAYPULSE_SMOKE_ANALYTICS_BASE_URL ?? 'http://localhost:4002'
  ),
  ingestBaseUrl: trimTrailingSlash(env.PLAYPULSE_SMOKE_INGEST_BASE_URL ?? 'http://localhost:4001'),
  metabaseBaseUrl: env.PLAYPULSE_SMOKE_METABASE_BASE_URL
    ? trimTrailingSlash(env.PLAYPULSE_SMOKE_METABASE_BASE_URL)
    : null,
  privateBearerToken:
    env.PLAYPULSE_SMOKE_ANALYTICS_PRIVATE_BEARER_TOKEN ??
    env.PLAYPULSE_ANALYTICS_PRIVATE_BEARER_TOKEN ??
    null,
});

const checkHttp = async (fetchFn, label, url, options = {}) => {
  const { parseJson = true, ...fetchOptions } = options;
  const response = await fetchFn(url, fetchOptions);

  if (!response.ok) {
    return {
      error: `${label} returned HTTP ${response.status}`,
      json: null,
      text: '',
    };
  }

  const text = await response.text();

  return {
    error: null,
    json: parseJson && text ? JSON.parse(text) : null,
    text,
  };
};

const hasMetric = (text, metricName) => text.includes(metricName);

export const runSmoke = async (
  env = process.env,
  fetchFn = fetch,
  write = (line) => {
    console.log(line);
  }
) => {
  const config = readConfig(env);
  const failures = [];

  const requiredChecks = [
    {
      label: 'ingest health',
      url: `${config.ingestBaseUrl}/health`,
      validate: (result) => result.json?.data?.status === 'ok',
    },
    {
      label: 'analytics health',
      url: `${config.analyticsBaseUrl}/health`,
      validate: (result) => result.json?.data?.status === 'ok',
    },
    {
      label: 'analytics summary',
      url: `${config.analyticsBaseUrl}/metrics/summary?game_id=all`,
      validate: (result) => Boolean(result.json?.data?.metrics),
    },
    {
      label: 'analytics sessions daily',
      url: `${config.analyticsBaseUrl}/metrics/sessions/daily?game_id=all&days=14`,
      validate: (result) => Array.isArray(result.json?.data?.points),
    },
    {
      label: 'analytics character popularity',
      url: `${config.analyticsBaseUrl}/metrics/characters/popularity?game_id=all&days=7`,
      validate: (result) => Array.isArray(result.json?.data?.characters),
    },
  ];

  for (const check of requiredChecks) {
    try {
      const result = await checkHttp(fetchFn, check.label, check.url);

      if (result.error) {
        failures.push(result.error);
      } else if (!check.validate(result)) {
        failures.push(`${check.label} returned an unexpected payload`);
      } else {
        write(`ok ${check.label}`);
      }
    } catch (error) {
      failures.push(`${check.label} failed: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  const metricsChecks = [
    {
      label: 'ingest metrics',
      metric: 'ingest_requests_total',
      url: `${config.ingestBaseUrl}/metrics`,
    },
    {
      label: 'analytics metrics',
      metric: 'analytics_requests_total',
      url: `${config.analyticsBaseUrl}/metrics`,
    },
  ];

  for (const check of metricsChecks) {
    try {
      const result = await checkHttp(fetchFn, check.label, check.url, { parseJson: false });

      if (result.error) {
        failures.push(result.error);
      } else if (!hasMetric(result.text, check.metric)) {
        failures.push(`${check.label} did not include ${check.metric}`);
      } else {
        write(`ok ${check.label}`);
      }
    } catch (error) {
      failures.push(`${check.label} failed: ${error instanceof Error ? error.message : 'unknown'}`);
    }
  }

  if (config.privateBearerToken) {
    try {
      const result = await checkHttp(
        fetchFn,
        'private retention',
        `${config.analyticsBaseUrl}/metrics/retention/cohorts?game_id=all&weeks=4`,
        {
          headers: {
            Authorization: `Bearer ${config.privateBearerToken}`,
          },
        }
      );

      if (result.error) {
        failures.push(result.error);
      } else if (!Array.isArray(result.json?.data?.cohorts)) {
        failures.push('private retention returned an unexpected payload');
      } else {
        write('ok private retention');
      }
    } catch (error) {
      failures.push(
        `private retention failed: ${error instanceof Error ? error.message : 'unknown'}`
      );
    }
  }

  if (config.metabaseBaseUrl) {
    try {
      const result = await checkHttp(
        fetchFn,
        'metabase session properties',
        `${config.metabaseBaseUrl}/api/session/properties`
      );

      if (result.error) {
        failures.push(result.error);
      } else if (!result.json || typeof result.json !== 'object') {
        failures.push('metabase session properties returned an unexpected payload');
      } else {
        write('ok metabase session properties');
      }
    } catch (error) {
      failures.push(
        `metabase session properties failed: ${
          error instanceof Error ? error.message : 'unknown'
        }`
      );
    }
  }

  return {
    failures,
    ok: failures.length === 0,
  };
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runSmoke();

  if (!result.ok) {
    for (const failure of result.failures) {
      console.error(`fail ${failure}`);
    }
    process.exitCode = 1;
  }
}
