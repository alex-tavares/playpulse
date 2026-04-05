# Demo Dataset Contract

This document defines the minimum seeded dataset required to validate the PlayPulse MVP locally and in preview environments.

## Goals

The seeded dataset must:

- cover both MythClash and MythTag
- drive the public dashboard charts and KPI strip
- drive the private retention view
- exercise both suppressed and unsuppressed public buckets
- include consented and non-consented events
- include recent data so freshness and last-updated states render meaningfully

## Minimum Dataset Characteristics

- At least 14 days of sessions-per-day data for public metrics.
- At least 8 weekly retention cohorts for private insights.
- Enough `character_selected` volume to render visible popularity bars.
- Both suppressed and unsuppressed public buckets in summary, sessions, and popularity outputs.
- `consent_analytics = true` and `consent_analytics = false` records in both titles.
- Recent events within the latest 15 minutes to exercise freshness UI and metadata.

## Title Coverage

### MythClash

| Event | Target volume range | Notes |
| --- | --- | --- |
| `session_start` | 900 to 1200 | Must support 14 public days plus 8 retention cohorts. |
| `session_end` | 900 to 1200 | Include varied durations for average session length. |
| `match_start` | 700 to 900 | Include multiple maps and ranked/casual mode IDs. |
| `match_end` | 700 to 900 | Include wins, losses, draws, and abandons. |
| `character_selected` | 1000 to 1400 | Include at least 6 characters with a long tail for suppression testing. |

### MythTag

| Event | Target volume range | Notes |
| --- | --- | --- |
| `session_start` | 600 to 900 | Must support 14 public days plus 8 retention cohorts. |
| `session_end` | 600 to 900 | Include varied durations for average session length. |
| `match_start` | 450 to 650 | Include multiple maps and ranked/casual mode IDs. |
| `match_end` | 450 to 650 | Include wins, losses, draws, and abandons. |
| `character_selected` | 700 to 1000 | Include at least 5 characters with a long tail for suppression testing. |

## Data Shape Rules

- Consent mix should keep 5% to 15% of events at `consent_analytics = false` so read-path filtering is testable.
- Public chart windows must contain at least 2 suppressed buckets and at least 5 visible unsuppressed buckets across the combined dataset.
- Character popularity should include one merged `other` bucket in public mode.
- Retention cohorts must include at least one cohort where `d7` retained count is below 10 so suppression behavior can be validated in private UI.
- Session durations should span short and long sessions so KPI and daily averages are non-flat.

## Acceptance Scenario

| Scenario | Expected seeded outcome |
| --- | --- |
| Public KPI summary | `active_players`, `matches_today`, and `avg_session_length_s` render with at least one title showing unsuppressed values. |
| Public sessions chart | Last 14 days render with zero-filled dates and at least one suppressed point. |
| Public popularity chart | Top characters render with visible bars and one merged suppressed `other` bucket. |
| Private retention view | At least 8 cohorts render with D1/D7 percentages; at least one retained count is hidden behind suppression. |
| Consent filtering | Removing `consent_analytics = false` rows changes raw storage totals without changing leaked public aggregates. |
| Freshness metadata | `last_updated` is recent enough to render live-ish dashboard copy without placeholder text. |

## Remaining Implementation Assumptions

- Seed generation may be static fixtures, SQL seeds, or application-level seed scripts, but it must preserve the contract above.
- Demo data may aggregate across both titles for public endpoints and still support per-title or combined retention views.
