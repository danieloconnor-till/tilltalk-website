-- Add soft-delete columns to profiles
-- deactivated_at: set when admin soft-deactivates an account
-- scheduled_deletion_at: deactivated_at + 7 days; cleanup job uses this

alter table public.profiles
  add column if not exists deactivated_at timestamptz,
  add column if not exists scheduled_deletion_at timestamptz;
