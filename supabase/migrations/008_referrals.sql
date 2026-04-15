-- Migration 008: Referral programme
-- Adds referral_code to profiles and creates the referrals tracking table.

-- 1. Add referral_code column to profiles (unique 8-char alphanumeric, generated at signup)
alter table public.profiles
  add column if not exists referral_code text unique;

-- 2. Referrals table — one row per referral link click → signup → conversion chain
create table if not exists public.referrals (
  id               uuid primary key default gen_random_uuid(),

  -- The person who shared the link (may be null if code not found at attribution time)
  referrer_id      uuid references public.profiles(id) on delete set null,

  -- The new user who signed up via the link (set after signup)
  referred_id      uuid references public.profiles(id) on delete set null,

  -- Captured at attribution time; used for manual claim lookup
  referred_email   text,

  -- Lifecycle: signed_up → converted → credited
  -- manual_pending = raised via manual claim form, awaiting admin approval
  status           text not null default 'signed_up'
                     check (status in ('signed_up', 'converted', 'credited', 'manual_pending')),

  -- Stripe credit applied to referrer (in cents)
  stripe_credit_cents integer,

  -- Timestamps
  created_at       timestamptz not null default now(),
  converted_at     timestamptz,
  credited_at      timestamptz
);

-- RLS: users can only read their own referral records (as referrer or referred)
alter table public.referrals enable row level security;

create policy "Users can view their own referrals"
  on public.referrals
  for select
  using (
    referrer_id = auth.uid() or referred_id = auth.uid()
  );

-- Service role bypasses RLS — all writes from server routes use service role.
