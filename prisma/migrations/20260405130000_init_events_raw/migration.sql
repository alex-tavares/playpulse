CREATE TABLE "events_raw" (
    "event_id" UUID NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "game_id" TEXT NOT NULL,
    "session_id" UUID NOT NULL,
    "player_id_hash" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "schema_version" TEXT NOT NULL,
    "game_version" TEXT NOT NULL,
    "build_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "locale" TEXT,
    "consent_analytics" BOOLEAN NOT NULL,
    "props_jsonb" JSONB NOT NULL,
    "ingest_source" TEXT NOT NULL DEFAULT 'godot_sdk',
    "inserted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "events_raw_pkey" PRIMARY KEY ("event_id")
);

CREATE INDEX "idx_events_raw_received_at" ON "events_raw"("received_at");
CREATE INDEX "idx_events_raw_game_event_occurred" ON "events_raw"("game_id", "event_name", "occurred_at");
CREATE INDEX "idx_events_raw_player_occurred" ON "events_raw"("player_id_hash", "occurred_at");
CREATE INDEX "idx_events_raw_session_events" ON "events_raw"("occurred_at") WHERE "event_name" IN ('session_start', 'session_end');
