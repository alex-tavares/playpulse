# ERD

```mermaid
erDiagram
    events_raw ||--o{ mv_sessions_daily : feeds
    events_raw ||--o{ mv_character_popularity : feeds
    events_raw ||--o{ retention_cohorts : feeds
    events_raw ||--o{ mv_metrics_summary_current : feeds
    dim_dates ||--o{ mv_sessions_daily : joins

    events_raw {
        uuid event_id
        timestamptz received_at
        timestamptz occurred_at
        text api_key_id
        text game_id
        text game_version
        text build_id
        uuid session_id
        text player_id_hash
        text event_name
        text schema_version
        text platform
        text locale
        boolean consent_analytics
        jsonb props_jsonb
        text ingest_source
        timestamptz inserted_at
    }

    mv_sessions_daily {
        date metric_date
        text game_id
        integer session_count
        integer active_players
        integer avg_session_length_s
        boolean suppressed
        timestamptz last_refreshed_at
    }

    mv_character_popularity {
        date metric_date
        text game_id
        text character_id
        integer pick_count
        float pick_ratio
        boolean suppressed
        timestamptz last_refreshed_at
    }

    retention_cohorts {
        date cohort_date
        text game_id
        integer cohort_size
        integer d1_retained
        integer d7_retained
        float d1_retention_pct
        float d7_retention_pct
        boolean d1_suppressed
        boolean d7_suppressed
        timestamptz last_refreshed_at
    }

    mv_metrics_summary_current {
        text game_id
        integer active_players_24h
        integer matches_today
        integer avg_session_length_s_24h
        boolean suppressed_active_players
        boolean suppressed_matches_today
        boolean suppressed_avg_session_length
        timestamptz last_refreshed_at
    }

    dim_dates {
        date calendar_date
    }
```

## Notes
- Phase 3 includes the initial Prisma schema and migration for `events_raw`.
- Phase 4 adds Prisma-managed `dim_dates` and `retention_cohorts`, plus SQL-managed materialized views for sessions, character popularity, and current KPI summary.
- `events_raw` remains append-only with 90-day retention.
- MVP ingest persists `ingest_source = 'godot_sdk'` for accepted SDK batches.
- `apps/warehouse-worker` owns the local refresh and demo-seed workflow through `refresh:rolling`, `refresh:retention`, `refresh:all`, and `seed:demo`.
- Sessions and KPI summary refresh from rolling commands; retention cohorts rebuild via a separate retention command.
- Zero-fill is performed through `dim_dates` joins for daily sessions; suppressed buckets are flagged in the derived structures themselves.
- Additional dimensions (characters metadata, etc.) can be linked later.
