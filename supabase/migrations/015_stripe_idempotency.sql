CREATE TABLE IF NOT EXISTS stripe_events (
  id           TEXT PRIMARY KEY,
  event_type   TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS stripe_events_processed_at_idx ON stripe_events (processed_at);
