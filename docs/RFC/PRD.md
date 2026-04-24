# RFC-001 - PlayPulse PRD

## Problem
Godot 4 teams still choose among three imperfect telemetry paths:
- **Hosted analytics vendors** (GameAnalytics, PlayFab) deliver polished analytics UIs fast, but they are closed-source, multi-engine, and route sensitive metrics through third-party clouds.
- **Generic analytics platforms** (Firebase, Amplitude) bring impressive tooling, yet need custom Godot shims, lock you into vendor pricing, and keep raw data outside your governance.
- **DIY pipelines** (OpenTelemetry + Kafka/Grafana, etc.) preserve control, but assembling them without a Godot-native SDK or ops expertise stalls smaller teams.

## Our Solution
PlayPulse gives Godot developers an open-source middle ground:
- **GDScript-first SDK for Godot 4** designed for desktop projects today, with C# bindings and export targets (mobile/web) on the near-term roadmap.
- **Auditable Node/TypeScript ingest service** that uses API keys + HMAC, applies consent gates, and enforces the privacy guardrails promised in the project brief.
- **Self-hostable Postgres warehouse and analytics API** with privacy-safe defaults, retention policies, and seeded demo data so teams can connect BI tools or custom consumers without vendor lock-in.
- **Focused analytics out of the box**: sessions/day, active players, character popularity, and early retention cohorts.
- **Straightforward deployment for indies** via Docker Compose or your own cloud infra, keeping telemetry under your control while remaining extensible if you decide to scale.

## Target Users & Needs
- **Primary**: Small Godot 4 teams (solo devs to 5-person studios) shipping gameplay-driven titles that need to understand player behavior to iterate post-launch.
- **Secondary**: Technical directors or senior engineers mentoring student or hobby teams who need a privacy-safe reference stack to teach telemetry fundamentals without wiring a custom backend.
- **Jobs-to-be-done**: Measure session length, level progression, character/build balance, and churn across updates; verify that consent policies are applied; connect warehouse outputs to the team’s preferred BI or community-built integration.
- **Pain relief**: Avoid maintaining bespoke pipelines, eliminate surprise vendor fees, and keep event data on infrastructure they control.

## Scope
**In scope**
- Godot 4 GDScript SDK with C# bindings and additional export targets tracked as roadmap follow-ons.
- Node/TypeScript ingest API with API key + HMAC auth, rate limiting, consent filtering, and Zod validation.
- Postgres warehouse with raw table plus materialized views for sessions/day, active players, character popularity, and retention cohorts.
- Analytics API enforcing k-anonymity and privacy-first read paths.
- DevEx guardrails: Docker Compose bootstrap, structured logging, and basic observability hooks.
- Optional companion repos for BI automation and example consumer integrations.

**Out of scope**
- Real-time streaming or push notifications.
- Advanced segmentation, ML-driven insights, or monetization analytics.
- Multi-engine SDK support beyond Godot, or mobile/web exporters in MVP.
- Managed hosting or commercial SaaS operations.
- Player-level CRM workflows or individualized alerts.

## Success Metrics
- Demo dataset is queryable through warehouse outputs and analytics endpoints with refresh <=15 minutes.
- Ingest p95 latency <=500 ms with >=99% accepted events under demo load.
- Analytics API enforces k-anonymity (no cohort <10) with automated tests.
- Developer can instrument a sample Godot scene in <=30 minutes following docs.

## Risks & Mitigations
- SDK adoption friction -> ship starter scenes, clear integration docs, and CI coverage for schema versions.
- Ingest abuse or DoS -> enforce rate limiting, HMAC verification, and request logging.
- Privacy regressions -> lint schemas, add CI tests for consent flags and k thresholds.
- Scope creep into advanced analytics -> lock roadmap stages, defer non-MVP asks to RFC backlog.
- Data freshness gaps -> monitor materialized view refresh jobs and document manual triggers.

## Non-goals
- Full BI tooling, funnel builders, or marketing automation in the core repo.
- Crash analytics or live ops alerting beyond basic metrics.
- Multi-tenant SaaS compliance commitments.
- Monetization telemetry or store integrations.

## Pilot & Open Questions
- Pilot validation will use MythClash and MythTag from Capivarious to seed demo data and example integration docs.
- Open questions: MVP launch date alignment; required size/shape of pilot dataset; hosting target (local only vs optional cloud deploy); identification of peer reviewer for RFC sign-off.
