-- claude_prompts: enable RLS and allow public (unauthenticated) reads.
-- These pages are intentionally public — anyone with the URL should be able to
-- read the prompt content (the UUID is effectively the access token).
-- Writes remain protected by the DON_ASSISTANT_SECRET header in the API route.
ALTER TABLE claude_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_claude_prompts"
  ON claude_prompts
  FOR SELECT
  TO public
  USING (true);
