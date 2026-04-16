-- 010_flags.sql
-- Flag system: auto-detected and manually raised quality signals.

-- ── flags table ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.flags (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    phone_number     text,
    message_text     text,
    flag_type        text NOT NULL CHECK (flag_type IN (
                        'frustration', 'data_error', 'human_requested',
                        'repeated_query', 'bot_failure', 'other'
                     )),
    flag_reason      text,
    auto_flagged     boolean DEFAULT true,
    confidence_score numeric(3,2),
    resolved         boolean DEFAULT false,
    resolved_at      timestamptz,
    resolved_by      text,
    resolution_notes text,
    -- FK to query_logs so we can trace back to the logged query
    query_log_id     uuid REFERENCES public.query_logs(id) ON DELETE SET NULL,
    created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS flags_client_id_idx   ON public.flags (client_id);
CREATE INDEX IF NOT EXISTS flags_resolved_idx    ON public.flags (resolved);
CREATE INDEX IF NOT EXISTS flags_created_at_idx  ON public.flags (created_at DESC);
CREATE INDEX IF NOT EXISTS flags_flag_type_idx   ON public.flags (flag_type);

ALTER TABLE public.flags ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (Railway writes, website admin reads)
CREATE POLICY "service_role_all" ON public.flags
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ── query_logs additions ──────────────────────────────────────────────────────

-- was_flagged: quick boolean for overview stats
ALTER TABLE public.query_logs
    ADD COLUMN IF NOT EXISTS was_flagged boolean DEFAULT false;

-- flag_id stored as plain uuid (no FK to avoid circular reference with flags.query_log_id)
ALTER TABLE public.query_logs
    ADD COLUMN IF NOT EXISTS flag_id uuid;

CREATE INDEX IF NOT EXISTS query_logs_was_flagged_idx ON public.query_logs (was_flagged)
    WHERE was_flagged = true;
