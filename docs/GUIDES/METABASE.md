# Metabase Guide

Metabase is the internal exploratory-analysis companion for PlayPulse. It exists alongside the custom dashboard, not in place of it.

## Why Metabase Exists

- Use the Next.js dashboard for the curated product/demo experience and privacy-specific UX.
- Use Metabase for ad hoc analysis, QA, warehouse inspection, and debugging.
- Default to warehouse-derived structures for normal analysis work.
- Treat `events_raw` as a separate debug surface, not the default analysis layer.

## Local Setup

1. Start Postgres and Metabase with:
   - `pnpm db:up:bi`
2. Open Metabase at:
   - `http://localhost:3001`
3. If you need to rerun the local Metabase setup:
   - `pnpm metabase:bootstrap`

The bootstrap flow:
- creates a local Metabase admin account
- creates a warehouse-first Postgres connection
- creates a separate debug/raw-events Postgres connection
- creates starter collections, saved questions, and dashboards

## Read-Only Credential Model

The repo creates two Postgres users for Metabase:

- `playpulse_bi_reader`
  - read-only access to:
    - `mv_metrics_summary_current`
    - `mv_sessions_daily`
    - `mv_character_popularity`
    - `retention_cohorts`
    - `dim_dates`
- `playpulse_bi_debug_reader`
  - same read-only warehouse access
  - plus `events_raw` for internal QA/debug questions

This keeps raw event browsing out of the default Metabase connection.

## Recommended Collections

- `PlayPulse Internal BI`
  - root collection for internal analysis content
- `Gameplay Overview`
  - warehouse-first product telemetry
- `Pipeline / QA`
  - raw-event and refresh-validation content

## Starter Questions and Dashboards

The local bootstrap creates:

- `Gameplay Overview` dashboard
  - `KPI Summary by Game`
  - `Sessions per Day (Last 14 Days)`
  - `Character Popularity (Last 7 Days)`
  - `Retention Cohorts (Latest 8)`
- `Pipeline / QA` dashboard
  - `Raw Event Counts by Game and Event Name`
  - `Recent Ingest Activity by Build`
  - `Consent Split by Event Name`
  - `Warehouse Refresh Freshness`
- Saved questions
  - `MythTag Sessions Last 14 Days`
  - `MythTag Character Popularity Last 7 Days`
  - `MythTag Retention Last 8 Cohorts`
  - `Recent Raw Events by Event Name`
  - `Latest character_selected Payloads`

## Which Datasets To Use First

Prefer these warehouse outputs for day-to-day analysis:

- `mv_metrics_summary_current`
- `mv_sessions_daily`
- `mv_character_popularity`
- `retention_cohorts`

Use `events_raw` only when you need to:

- validate ingest behavior
- inspect payloads from local game runs
- debug schema or bridge issues
- verify refresh inputs against derived outputs

## Warehouse Semantics

- `mv_sessions_daily`
  - zero-filled by date joins
- `mv_character_popularity`
  - sparse by date; aggregate across windows when needed
- `retention_cohorts`
  - weekly/private-oriented derived table
- `mv_metrics_summary_current`
  - includes suppression flags that may already explain hidden values

## Local Workflow

Typical local flow:

1. `pnpm db:up:bi`
2. `pnpm db:migrate`
3. `pnpm db:seed-demo`
4. `pnpm db:refresh`
5. Open Metabase and inspect the starter dashboards

After a new local game run:

1. run the game
2. `pnpm db:refresh`
3. `pnpm db:refresh:retention` if the run affects retention analysis
4. refresh the relevant Metabase question or dashboard card

## Boundary Rule

Metabase is internal.

The custom dashboard remains the product-facing surface for:
- public/private page structure
- suppression UX
- demo presentation
- opinionated, recruiter-friendly storytelling
