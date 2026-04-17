-- Claude Code prompt store: one-tap copy pages sent by don-assistant.
-- No RLS — internal use only, accessed via service role key.
CREATE TABLE IF NOT EXISTS claude_prompts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
