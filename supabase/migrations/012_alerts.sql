-- ─────────────────────────────────────────────────────────────────────────────
-- 012_alerts.sql
-- User-configurable stock alerts and proactive notification settings.
-- Both WhatsApp and dashboard can read/write these tables.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Stock alerts (item-specific thresholds) ───────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_alerts (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          uuid         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_name          text         NOT NULL,          -- matches POS item name (case-insensitive)
  threshold          integer      NOT NULL DEFAULT 5, -- alert when stock falls below this
  active             boolean      NOT NULL DEFAULT true,
  last_triggered_at  timestamptz,                    -- last time alert was fired (rate-limiting)
  created_at         timestamptz  NOT NULL DEFAULT now(),
  updated_at         timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (client_id, item_name)
);

CREATE INDEX IF NOT EXISTS stock_alerts_client_idx ON stock_alerts (client_id) WHERE active = true;

ALTER TABLE stock_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_alerts_owner_all" ON stock_alerts
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "stock_alerts_service_role_all" ON stock_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Proactive alert settings (one row per client) ─────────────────────────────

CREATE TABLE IF NOT EXISTS alert_settings (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id                uuid    NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  -- Event / footfall alerts
  event_alerts_enabled     boolean NOT NULL DEFAULT true,
  event_alert_radius_km    integer NOT NULL DEFAULT 2,
  -- General low-stock alerts (applies when no specific stock_alerts rows exist)
  inventory_alerts_enabled boolean NOT NULL DEFAULT true,
  inventory_threshold      integer NOT NULL DEFAULT 5,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_settings_owner_all" ON alert_settings
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "alert_settings_service_role_all" ON alert_settings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
