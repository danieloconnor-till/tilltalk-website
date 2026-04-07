-- Add UTM source tracking to profiles for marketing analytics
alter table public.profiles
  add column if not exists utm_source text;
