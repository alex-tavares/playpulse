# ERD

```mermaid
erDiagram
    events_raw ||--o{ mv_sessions_daily : feeds
    events_raw ||--o{ mv_character_popularity : feeds
    events_raw ||--o{ mv_retention_cohorts : feeds
    dim_dates ||--o{ mv_sessions_daily : joins
    dim_dates ||--o{ mv_character_popularity : joins

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
        text consent_bucket
        integer session_count
        integer active_players
        interval avg_duration
        boolean suppressed
    }

    mv_character_popularity {
        date metric_date
        text game_id
        text character_id
        integer pick_count
        numeric pick_ratio
        boolean suppressed
    }

    mv_retention_cohorts {
        date cohort_date
        text game_id
        integer cohort_size
        integer d1_retained
        integer d7_retained
        boolean d1_suppressed
        boolean d7_suppressed
    }

    dim_dates {
        date calendar_date
    }
```

## Notes
- Phase 3 includes the initial Prisma schema and migration for `events_raw`.
- `events_raw` remains append-only with 90-day retention.
- MVP ingest persists `ingest_source = 'godot_sdk'` for accepted SDK batches.
- Materialized views refresh every 5 minutes (sessions/popularity) or nightly (retention).
- Zero-fill performed via `dim_dates` joins; suppressed buckets flagged in derived views.
- Additional dimensions (characters metadata, etc.) can be linked later.
