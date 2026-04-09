# Metabase Guide

Metabase is no longer maintained in the core PlayPulse repo.

Use the BI companion repo instead:
- [alex-tavares/playpulse-bi](https://github.com/alex-tavares/playpulse-bi)

That repo owns:
- Metabase compose setup
- read-only BI user bootstrap
- starter dashboards and saved questions
- local and remote Postgres connection guidance

In the core PlayPulse repo, the warehouse outputs remain the canonical analysis surface:
- `mv_metrics_summary_current`
- `mv_sessions_daily`
- `mv_character_popularity`
- `retention_cohorts`
