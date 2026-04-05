CREATE TABLE "dim_dates" (
    "calendar_date" DATE NOT NULL,
    CONSTRAINT "dim_dates_pkey" PRIMARY KEY ("calendar_date")
);

CREATE TABLE "retention_cohorts" (
    "cohort_date" DATE NOT NULL,
    "game_id" TEXT NOT NULL,
    "cohort_size" INTEGER NOT NULL,
    "d1_retained" INTEGER NOT NULL,
    "d7_retained" INTEGER NOT NULL,
    "d1_retention_pct" DOUBLE PRECISION NOT NULL,
    "d7_retention_pct" DOUBLE PRECISION NOT NULL,
    "d1_suppressed" BOOLEAN NOT NULL,
    "d7_suppressed" BOOLEAN NOT NULL,
    "last_refreshed_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "retention_cohorts_pkey" PRIMARY KEY ("cohort_date", "game_id")
);

CREATE MATERIALIZED VIEW "mv_sessions_daily" AS
WITH games(game_id) AS (
    VALUES ('mythclash'::TEXT), ('mythtag'::TEXT)
),
session_end_stats AS (
    SELECT
        ("occurred_at" AT TIME ZONE 'UTC')::DATE AS metric_date,
        "game_id",
        COUNT(*)::INTEGER AS session_count,
        COUNT(DISTINCT "player_id_hash")::INTEGER AS active_players,
        COALESCE(ROUND(AVG(("props_jsonb" ->> 'duration_s')::NUMERIC))::INTEGER, 0) AS avg_session_length_s
    FROM "events_raw"
    WHERE "event_name" = 'session_end'
      AND "consent_analytics" = TRUE
    GROUP BY 1, 2
)
SELECT
    d."calendar_date" AS metric_date,
    g.game_id,
    COALESCE(s.session_count, 0)::INTEGER AS session_count,
    COALESCE(s.active_players, 0)::INTEGER AS active_players,
    COALESCE(s.avg_session_length_s, 0)::INTEGER AS avg_session_length_s,
    CASE
        WHEN COALESCE(s.active_players, 0) BETWEEN 1 AND 9 THEN TRUE
        ELSE FALSE
    END AS suppressed,
    CURRENT_TIMESTAMP AS last_refreshed_at
FROM "dim_dates" d
CROSS JOIN games g
LEFT JOIN session_end_stats s
  ON s.metric_date = d."calendar_date"
 AND s."game_id" = g.game_id;

CREATE UNIQUE INDEX "mv_sessions_daily_unique" ON "mv_sessions_daily" ("metric_date", "game_id");

CREATE MATERIALIZED VIEW "mv_character_popularity" AS
WITH character_totals AS (
    SELECT
        ("occurred_at" AT TIME ZONE 'UTC')::DATE AS metric_date,
        "game_id",
        COALESCE("props_jsonb" ->> 'character_id', 'unknown') AS character_id,
        COUNT(*)::INTEGER AS pick_count,
        COUNT(DISTINCT "player_id_hash")::INTEGER AS distinct_players
    FROM "events_raw"
    WHERE "event_name" = 'character_selected'
      AND "consent_analytics" = TRUE
    GROUP BY 1, 2, 3
),
daily_totals AS (
    SELECT
        metric_date,
        "game_id",
        SUM(pick_count)::INTEGER AS total_pick_count
    FROM character_totals
    GROUP BY 1, 2
)
SELECT
    c.metric_date,
    c."game_id",
    c.character_id,
    c.pick_count,
    CASE
        WHEN d.total_pick_count = 0 THEN 0::DOUBLE PRECISION
        ELSE c.pick_count::DOUBLE PRECISION / d.total_pick_count::DOUBLE PRECISION
    END AS pick_ratio,
    CASE
        WHEN c.distinct_players BETWEEN 1 AND 9 THEN TRUE
        ELSE FALSE
    END AS suppressed,
    CURRENT_TIMESTAMP AS last_refreshed_at
FROM character_totals c
INNER JOIN daily_totals d
    ON d.metric_date = c.metric_date
   AND d."game_id" = c."game_id";

CREATE UNIQUE INDEX "mv_character_popularity_unique"
    ON "mv_character_popularity" ("metric_date", "game_id", "character_id");

CREATE MATERIALIZED VIEW "mv_metrics_summary_current" AS
WITH games(game_id) AS (
    VALUES ('mythclash'::TEXT), ('mythtag'::TEXT)
),
active_players AS (
    SELECT
        "game_id",
        COUNT(DISTINCT "player_id_hash")::INTEGER AS active_players_24h
    FROM "events_raw"
    WHERE "event_name" = 'session_end'
      AND "consent_analytics" = TRUE
      AND "occurred_at" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY 1
),
matches_today AS (
    SELECT
        "game_id",
        COUNT(*)::INTEGER AS matches_today,
        COUNT(DISTINCT "player_id_hash")::INTEGER AS matches_player_count
    FROM "events_raw"
    WHERE "event_name" = 'match_end'
      AND "consent_analytics" = TRUE
      AND ("occurred_at" AT TIME ZONE 'UTC')::DATE = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE
    GROUP BY 1
),
session_averages AS (
    SELECT
        "game_id",
        COUNT(DISTINCT "player_id_hash")::INTEGER AS session_player_count,
        COALESCE(ROUND(AVG(("props_jsonb" ->> 'duration_s')::NUMERIC))::INTEGER, 0) AS avg_session_length_s_24h
    FROM "events_raw"
    WHERE "event_name" = 'session_end'
      AND "consent_analytics" = TRUE
      AND "occurred_at" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
    GROUP BY 1
)
SELECT
    g.game_id,
    COALESCE(a.active_players_24h, 0)::INTEGER AS active_players_24h,
    COALESCE(m.matches_today, 0)::INTEGER AS matches_today,
    COALESCE(s.avg_session_length_s_24h, 0)::INTEGER AS avg_session_length_s_24h,
    CASE
        WHEN COALESCE(a.active_players_24h, 0) BETWEEN 1 AND 9 THEN TRUE
        ELSE FALSE
    END AS suppressed_active_players,
    CASE
        WHEN COALESCE(m.matches_player_count, 0) BETWEEN 1 AND 9 THEN TRUE
        ELSE FALSE
    END AS suppressed_matches_today,
    CASE
        WHEN COALESCE(s.session_player_count, 0) BETWEEN 1 AND 9 THEN TRUE
        ELSE FALSE
    END AS suppressed_avg_session_length,
    CURRENT_TIMESTAMP AS last_refreshed_at
FROM games g
LEFT JOIN active_players a ON a."game_id" = g.game_id
LEFT JOIN matches_today m ON m."game_id" = g.game_id
LEFT JOIN session_averages s ON s."game_id" = g.game_id;

CREATE UNIQUE INDEX "mv_metrics_summary_current_unique"
    ON "mv_metrics_summary_current" ("game_id");
