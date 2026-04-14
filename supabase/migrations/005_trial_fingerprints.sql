-- Trial abuse prevention fingerprints.
-- Stored in a table separate from profiles so data persists after account purge.
-- merchant_id is stored as plain text and is NEVER deleted.
-- email_domain_hash and ip_hash are SHA-256 hex strings for GDPR compliance.

create table if not exists public.trial_fingerprints (
  id                 uuid        primary key default gen_random_uuid(),
  email_domain_hash  text,            -- SHA-256 hex of lowercase email domain (null for free providers)
  ip_hash            text,            -- SHA-256 hex of signup IP address
  merchant_id        text,            -- POS merchant/location ID (plain, permanent)
  created_at         timestamptz not null default now()
);

create index if not exists trial_fingerprints_email_domain_hash_idx
  on public.trial_fingerprints (email_domain_hash)
  where email_domain_hash is not null;

create index if not exists trial_fingerprints_ip_hash_idx
  on public.trial_fingerprints (ip_hash)
  where ip_hash is not null;

create index if not exists trial_fingerprints_merchant_id_idx
  on public.trial_fingerprints (merchant_id)
  where merchant_id is not null;

-- Only the service role (API routes) can read/write this table.
alter table public.trial_fingerprints enable row level security;
