-- Migration 007: sandbox_clients table
-- Stores founder sandbox POS configurations (one row per pos_type)

create table if not exists public.sandbox_clients (
  id          uuid primary key default gen_random_uuid(),
  pos_type    text not null,
  api_token   text not null default '',
  merchant_id text not null default '',
  api_base    text not null default '',
  updated_at  timestamptz not null default now(),
  constraint sandbox_clients_pos_type_key unique (pos_type)
);

-- RLS: disabled — this table is only accessed via service role from admin routes.
-- No public access is granted.
alter table public.sandbox_clients enable row level security;
