# Architecture (snapshot)

- **SDK (Godot)** → HTTP POST (write-only, HMAC) → **Ingestion API (Express+TS)**  
- **Postgres**: `events_raw` + derived tables/materialized views  
- **Analytics API**: read-only, aggregates with k-anonymity  
- **Dashboard (Next.js 14)**: public (anonymized) + private (auth)

MVP diagrams + ERD will be added in the next commit.
