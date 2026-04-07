-- Add POS address and credential fields to profiles
alter table public.profiles
  add column if not exists pos_address_street text,
  add column if not exists pos_address_city text,
  add column if not exists pos_address_country text default 'Ireland',
  add column if not exists pos_api_key text,
  add column if not exists pos_api_secret text;
