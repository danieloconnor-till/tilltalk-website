-- ─────────────────────────────────────────────────────────────────────────────
-- 011_notes_reminders.sql
-- Moves notes and reminders to Supabase so both WhatsApp and dashboard share
-- the same data source.  phone_number is stored on reminders so the Railway
-- scheduler can deliver without an extra DB round-trip.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Notes ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note_text   text NOT NULL,
  is_complete boolean      NOT NULL DEFAULT false,
  created_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_client_id_idx  ON notes (client_id);
CREATE INDEX IF NOT EXISTS notes_created_at_idx ON notes (client_id, created_at DESC);

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Users can manage their own notes
CREATE POLICY "notes_owner_all" ON notes
  FOR ALL USING (auth.uid() = client_id);

-- Service role (Railway bot) bypasses RLS
CREATE POLICY "notes_service_role_all" ON notes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Reminders ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reminders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reminder_text   text         NOT NULL,
  remind_at       timestamptz  NOT NULL,
  appointment_at  timestamptz,
  is_sent         boolean      NOT NULL DEFAULT false,
  -- WhatsApp number for delivery — copied from profiles.whatsapp_number at creation
  phone_number    text,
  created_at      timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reminders_client_id_idx  ON reminders (client_id);
CREATE INDEX IF NOT EXISTS reminders_due_idx        ON reminders (remind_at) WHERE is_sent = false;

ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Users can manage their own reminders
CREATE POLICY "reminders_owner_all" ON reminders
  FOR ALL USING (auth.uid() = client_id);

-- Service role (Railway bot) bypasses RLS
CREATE POLICY "reminders_service_role_all" ON reminders
  FOR ALL TO service_role USING (true) WITH CHECK (true);
