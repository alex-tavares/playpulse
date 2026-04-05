import process from 'node:process';

const baseUrl = process.env.PLAYPULSE_METABASE_BASE_URL ?? 'http://localhost:3001';
const siteName = process.env.PLAYPULSE_METABASE_SITE_NAME ?? 'PlayPulse Internal BI';
const adminEmail = process.env.PLAYPULSE_METABASE_ADMIN_EMAIL ?? 'admin@playpulse.local';
const adminPassword =
  process.env.PLAYPULSE_METABASE_ADMIN_PASSWORD ?? 'playpulse-metabase-admin-2026!';
const warehouseUser = process.env.PLAYPULSE_BI_READER_USER ?? 'playpulse_bi_reader';
const warehousePassword =
  process.env.PLAYPULSE_BI_READER_PASSWORD ?? 'playpulse_bi_reader';
const debugUser = process.env.PLAYPULSE_BI_DEBUG_READER_USER ?? 'playpulse_bi_debug_reader';
const debugPassword =
  process.env.PLAYPULSE_BI_DEBUG_READER_PASSWORD ?? 'playpulse_bi_debug_reader';
const warehouseDatabaseName =
  process.env.PLAYPULSE_METABASE_WAREHOUSE_DB_NAME ?? 'PlayPulse Warehouse';
const debugDatabaseName =
  process.env.PLAYPULSE_METABASE_DEBUG_DB_NAME ?? 'PlayPulse Debug / Pipeline';
const postgresHost = process.env.PLAYPULSE_METABASE_POSTGRES_HOST ?? 'host.docker.internal';
const postgresPort = Number(process.env.PLAYPULSE_METABASE_POSTGRES_PORT ?? 5432);
const postgresDbName = process.env.PLAYPULSE_METABASE_POSTGRES_DB ?? 'playpulse';

const starterCollections = [
  {
    name: 'Gameplay Overview',
    description: 'Warehouse-first product telemetry for internal analysis.',
    color: '#2F6F57',
    questions: [
      {
        name: 'KPI Summary by Game',
        description: 'Current summary metrics and suppression flags from the warehouse.',
        database: warehouseDatabaseName,
        display: 'table',
        visualizationSettings: {},
        sql: `
select
  game_id,
  active_players_24h,
  suppressed_active_players,
  matches_today,
  suppressed_matches_today,
  avg_session_length_s_24h,
  suppressed_avg_session_length,
  last_refreshed_at
from mv_metrics_summary_current
order by game_id;
        `,
      },
      {
        name: 'Sessions per Day (Last 14 Days)',
        description: 'Zero-filled daily session metrics by game.',
        database: warehouseDatabaseName,
        display: 'line',
        visualizationSettings: {
          'graph.dimensions': ['metric_date', 'game_id'],
          'graph.metrics': ['session_count'],
        },
        sql: `
select
  metric_date,
  game_id,
  session_count,
  active_players,
  avg_session_length_s,
  suppressed
from mv_sessions_daily
where metric_date >= current_date - interval '13 day'
order by metric_date, game_id;
        `,
      },
      {
        name: 'Character Popularity (Last 7 Days)',
        description: 'Warehouse-derived character pick counts and ratios by game.',
        database: warehouseDatabaseName,
        display: 'bar',
        visualizationSettings: {
          'graph.dimensions': ['character_id', 'game_id'],
          'graph.metrics': ['pick_count'],
        },
        sql: `
select
  game_id,
  character_id,
  sum(pick_count) as pick_count,
  round(avg(pick_ratio)::numeric, 4) as avg_pick_ratio,
  bool_or(suppressed) as suppressed
from mv_character_popularity
where metric_date >= current_date - interval '6 day'
group by game_id, character_id
order by game_id, pick_count desc, character_id;
        `,
      },
      {
        name: 'Retention Cohorts (Latest 8)',
        description: 'Weekly retention cohorts for private/internal analysis.',
        database: warehouseDatabaseName,
        display: 'line',
        visualizationSettings: {
          'graph.dimensions': ['cohort_date', 'game_id'],
          'graph.metrics': ['d1_retention_pct', 'd7_retention_pct'],
        },
        sql: `
select
  cohort_date,
  game_id,
  cohort_size,
  d1_retention_pct,
  d7_retention_pct,
  d1_suppressed,
  d7_suppressed,
  last_refreshed_at
from retention_cohorts
where cohort_date >= current_date - interval '56 day'
order by cohort_date, game_id;
        `,
      },
      {
        name: 'MythTag Sessions Last 14 Days',
        description: 'Saved helper for current MythTag session trends.',
        database: warehouseDatabaseName,
        display: 'line',
        visualizationSettings: {
          'graph.dimensions': ['metric_date'],
          'graph.metrics': ['session_count', 'active_players'],
        },
        sql: `
select
  metric_date,
  session_count,
  active_players,
  avg_session_length_s,
  suppressed
from mv_sessions_daily
where game_id = 'mythtag'
  and metric_date >= current_date - interval '13 day'
order by metric_date;
        `,
      },
      {
        name: 'MythTag Character Popularity Last 7 Days',
        description: 'Saved helper for MythTag character selection analysis.',
        database: warehouseDatabaseName,
        display: 'bar',
        visualizationSettings: {
          'graph.dimensions': ['character_id'],
          'graph.metrics': ['pick_count'],
        },
        sql: `
select
  character_id,
  sum(pick_count) as pick_count,
  round(avg(pick_ratio)::numeric, 4) as avg_pick_ratio,
  bool_or(suppressed) as suppressed
from mv_character_popularity
where game_id = 'mythtag'
  and metric_date >= current_date - interval '6 day'
group by character_id
order by pick_count desc, character_id;
        `,
      },
      {
        name: 'MythTag Retention Last 8 Cohorts',
        description: 'Saved helper for the latest MythTag retention cohorts.',
        database: warehouseDatabaseName,
        display: 'line',
        visualizationSettings: {
          'graph.dimensions': ['cohort_date'],
          'graph.metrics': ['d1_retention_pct', 'd7_retention_pct'],
        },
        sql: `
select
  cohort_date,
  cohort_size,
  d1_retained,
  d1_retention_pct,
  d1_suppressed,
  d7_retained,
  d7_retention_pct,
  d7_suppressed
from retention_cohorts
where game_id = 'mythtag'
order by cohort_date desc
limit 8;
        `,
      },
    ],
    dashboard: {
      name: 'Gameplay Overview',
      description: 'Internal gameplay analysis from warehouse-derived structures.',
      cards: [
        { question: 'KPI Summary by Game', row: 0, col: 0, sizeX: 12, sizeY: 4 },
        { question: 'Sessions per Day (Last 14 Days)', row: 4, col: 0, sizeX: 12, sizeY: 6 },
        { question: 'Character Popularity (Last 7 Days)', row: 10, col: 0, sizeX: 12, sizeY: 6 },
        { question: 'Retention Cohorts (Latest 8)', row: 16, col: 0, sizeX: 12, sizeY: 6 },
      ],
    },
  },
  {
    name: 'Pipeline / QA',
    description: 'Internal debug and validation views for ingest and warehouse workflows.',
    color: '#C47B2A',
    questions: [
      {
        name: 'Raw Event Counts by Game and Event Name',
        description: 'Recent raw event volume for pipeline verification.',
        database: debugDatabaseName,
        display: 'table',
        visualizationSettings: {},
        sql: `
select
  date(occurred_at) as event_date,
  game_id,
  event_name,
  count(*) as event_count
from events_raw
where occurred_at >= current_date - interval '13 day'
group by date(occurred_at), game_id, event_name
order by event_date desc, game_id, event_name;
        `,
      },
      {
        name: 'Recent Ingest Activity by Build',
        description: 'Recent ingest volume grouped by build and ingest source.',
        database: debugDatabaseName,
        display: 'table',
        visualizationSettings: {},
        sql: `
select
  received_at::date as received_date,
  game_id,
  build_id,
  ingest_source,
  count(*) as event_count
from events_raw
where received_at >= now() - interval '7 day'
group by received_at::date, game_id, build_id, ingest_source
order by received_date desc, event_count desc, build_id;
        `,
      },
      {
        name: 'Consent Split by Event Name',
        description: 'Consented versus non-consented raw event counts.',
        database: debugDatabaseName,
        display: 'bar',
        visualizationSettings: {
          'graph.dimensions': ['event_name', 'consent_analytics'],
          'graph.metrics': ['event_count'],
        },
        sql: `
select
  event_name,
  consent_analytics,
  count(*) as event_count
from events_raw
where occurred_at >= now() - interval '14 day'
group by event_name, consent_analytics
order by event_name, consent_analytics;
        `,
      },
      {
        name: 'Warehouse Refresh Freshness',
        description: 'Last refresh timestamps across derived structures.',
        database: debugDatabaseName,
        display: 'table',
        visualizationSettings: {},
        sql: `
select 'mv_sessions_daily' as relation_name, max(last_refreshed_at) as last_refreshed_at from mv_sessions_daily
union all
select 'mv_character_popularity' as relation_name, max(last_refreshed_at) as last_refreshed_at from mv_character_popularity
union all
select 'mv_metrics_summary_current' as relation_name, max(last_refreshed_at) as last_refreshed_at from mv_metrics_summary_current
union all
select 'retention_cohorts' as relation_name, max(last_refreshed_at) as last_refreshed_at from retention_cohorts
order by relation_name;
        `,
      },
      {
        name: 'Recent Raw Events by Event Name',
        description: 'Recent raw counts to check local game runs and seed updates.',
        database: debugDatabaseName,
        display: 'table',
        visualizationSettings: {},
        sql: `
select
  event_name,
  count(*) as event_count,
  max(occurred_at) as latest_occurred_at
from events_raw
group by event_name
order by latest_occurred_at desc, event_name;
        `,
      },
      {
        name: 'Latest character_selected Payloads',
        description: 'Inspect the most recent character selection payloads for bridge validation.',
        database: debugDatabaseName,
        display: 'table',
        visualizationSettings: {},
        sql: `
select
  occurred_at,
  game_id,
  build_id,
  player_id_hash,
  props_jsonb ->> 'character_id' as character_id,
  props_jsonb
from events_raw
where event_name = 'character_selected'
order by occurred_at desc
limit 25;
        `,
      },
    ],
    dashboard: {
      name: 'Pipeline / QA',
      description: 'Internal pipeline visibility for ingest, consent, and warehouse freshness.',
      cards: [
        { question: 'Raw Event Counts by Game and Event Name', row: 0, col: 0, sizeX: 12, sizeY: 6 },
        { question: 'Recent Ingest Activity by Build', row: 6, col: 0, sizeX: 12, sizeY: 6 },
        { question: 'Consent Split by Event Name', row: 12, col: 0, sizeX: 12, sizeY: 6 },
        { question: 'Warehouse Refresh Freshness', row: 18, col: 0, sizeX: 12, sizeY: 4 },
      ],
    },
  },
];

function normalizeDataArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
}

async function requestJson(path, { method = 'GET', sessionToken, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(sessionToken ? { 'X-Metabase-Session': sessionToken } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${method} ${path} failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function waitForMetabase() {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    try {
      await requestJson('/api/session/properties');
      return;
    } catch (_error) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error('Metabase did not become ready in time.');
}

async function setupMetabase() {
  const properties = await requestJson('/api/session/properties');
  if (properties['has-user-setup']) {
    return;
  }

  await requestJson('/api/setup', {
    method: 'POST',
    body: {
      token: properties['setup-token'],
      prefs: {
        site_name: siteName,
      },
      user: {
        first_name: 'PlayPulse',
        last_name: 'Admin',
        email: adminEmail,
        password: adminPassword,
      },
      database: {
        name: warehouseDatabaseName,
        engine: 'postgres',
        is_full_sync: true,
        details: {
          host: postgresHost,
          port: postgresPort,
          dbname: postgresDbName,
          user: warehouseUser,
          password: warehousePassword,
          ssl: false,
        },
      },
      invite: false,
    },
  });
}

async function createSession() {
  const session = await requestJson('/api/session', {
    method: 'POST',
    body: {
      username: adminEmail,
      password: adminPassword,
    },
  });

  return session.id;
}

async function listDatabases(sessionToken) {
  return normalizeDataArray(await requestJson('/api/database', { sessionToken }));
}

async function ensureDatabase(sessionToken, name, user, password) {
  const existing = (await listDatabases(sessionToken)).find((database) => database.name === name);
  if (existing) {
    return existing;
  }

  return requestJson('/api/database', {
    method: 'POST',
    sessionToken,
    body: {
      name,
      engine: 'postgres',
      is_full_sync: true,
      details: {
        host: postgresHost,
        port: postgresPort,
        dbname: postgresDbName,
        user,
        password,
        ssl: false,
      },
    },
  });
}

async function syncDatabase(sessionToken, databaseId) {
  await requestJson(`/api/database/${databaseId}/sync_schema`, {
    method: 'POST',
    sessionToken,
  });
}

async function listCollections(sessionToken) {
  return normalizeDataArray(await requestJson('/api/collection', { sessionToken }));
}

async function ensureCollection(sessionToken, { name, description, color, parent_id }) {
  const existing = (await listCollections(sessionToken)).find(
    (collection) => collection.name === name && (collection.parent_id ?? null) === (parent_id ?? null),
  );
  if (existing) {
    return existing;
  }

  return requestJson('/api/collection', {
    method: 'POST',
    sessionToken,
    body: {
      name,
      description,
      color,
      ...(parent_id ? { parent_id } : {}),
    },
  });
}

async function listCards(sessionToken) {
  const cards = await requestJson('/api/card', { sessionToken });
  return Array.isArray(cards) ? cards : [];
}

async function ensureCard(sessionToken, collectionId, databaseId, definition) {
  const existing = (await listCards(sessionToken)).find(
    (card) => card.name === definition.name && card.collection_id === collectionId,
  );
  if (existing) {
    return requestJson(`/api/card/${existing.id}`, {
      method: 'PUT',
      sessionToken,
      body: {
        name: definition.name,
        description: definition.description,
        display: definition.display,
        visualization_settings: definition.visualizationSettings ?? {},
        collection_id: collectionId,
        dataset_query: {
          type: 'native',
          database: databaseId,
          native: {
            query: definition.sql.trim(),
          },
        },
      },
    });
  }

  return requestJson('/api/card', {
    method: 'POST',
    sessionToken,
    body: {
      name: definition.name,
      description: definition.description,
      display: definition.display,
      visualization_settings: definition.visualizationSettings ?? {},
      collection_id: collectionId,
      dataset_query: {
        type: 'native',
        database: databaseId,
        native: {
          query: definition.sql.trim(),
        },
      },
    },
  });
}

async function listDashboards(sessionToken) {
  const dashboards = await requestJson('/api/dashboard', { sessionToken });
  return Array.isArray(dashboards) ? dashboards : [];
}

async function ensureDashboard(sessionToken, collectionId, dashboardDefinition) {
  const existing = (await listDashboards(sessionToken)).find(
    (dashboard) => dashboard.name === dashboardDefinition.name && dashboard.collection_id === collectionId,
  );
  if (existing) {
    return existing;
  }

  return requestJson('/api/dashboard', {
    method: 'POST',
    sessionToken,
    body: {
      name: dashboardDefinition.name,
      description: dashboardDefinition.description,
      collection_id: collectionId,
    },
  });
}

async function ensureDashboardCards(sessionToken, dashboardId, cardsByName, dashboardDefinition) {
  const dashboard = await requestJson(`/api/dashboard/${dashboardId}`, { sessionToken });
  if ((dashboard.dashcards ?? []).length > 0) {
    return;
  }

  const cards = dashboardDefinition.cards
    .map((cardLayout, index) => {
      const card = cardsByName.get(cardLayout.question);
      if (!card) {
        return null;
      }

      return {
        id: -1 - index,
        card_id: card.id,
        row: cardLayout.row,
        col: cardLayout.col,
        size_x: cardLayout.sizeX,
        size_y: cardLayout.sizeY,
        parameter_mappings: [],
        visualization_settings: {},
      };
    })
    .filter(Boolean);

  if (cards.length === 0) {
    return;
  }

  await requestJson(`/api/dashboard/${dashboardId}/cards`, {
    method: 'PUT',
    sessionToken,
    body: {
      cards,
    },
  });
}

async function main() {
  await waitForMetabase();
  await setupMetabase();
  const sessionToken = await createSession();

  const warehouseDatabase = await ensureDatabase(
    sessionToken,
    warehouseDatabaseName,
    warehouseUser,
    warehousePassword,
  );
  const debugDatabase = await ensureDatabase(
    sessionToken,
    debugDatabaseName,
    debugUser,
    debugPassword,
  );

  await syncDatabase(sessionToken, warehouseDatabase.id);
  await syncDatabase(sessionToken, debugDatabase.id);

  const rootCollection = await ensureCollection(sessionToken, {
    name: 'PlayPulse Internal BI',
    description:
      'Internal exploratory analysis companion for the PlayPulse warehouse and debug pipeline.',
    color: '#2F6F57',
  });

  for (const collection of starterCollections) {
    const childCollection = await ensureCollection(sessionToken, {
      name: collection.name,
      description: collection.description,
      color: collection.color,
      parent_id: rootCollection.id,
    });

    const cardsByName = new Map();
    for (const question of collection.questions) {
      const databaseId =
        question.database === warehouseDatabaseName ? warehouseDatabase.id : debugDatabase.id;
      const card = await ensureCard(sessionToken, childCollection.id, databaseId, question);
      cardsByName.set(question.name, card);
    }

    const dashboard = await ensureDashboard(sessionToken, childCollection.id, collection.dashboard);
    await ensureDashboardCards(sessionToken, dashboard.id, cardsByName, collection.dashboard);
  }

  console.log('Metabase local bootstrap completed.');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
