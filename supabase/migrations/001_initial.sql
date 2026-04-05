-- profiles table
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  restaurant_name text,
  pos_type text check (pos_type in ('clover','square','eposnow')),
  pos_merchant_id text,
  whatsapp_number text,
  plan text check (plan in ('starter','pro','business')) default 'starter',
  trial_start timestamptz default now(),
  trial_end timestamptz default (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- trial_extensions table
create table if not exists public.trial_extensions (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  extended_by_days integer not null,
  extended_by text not null,
  reason text,
  created_at timestamptz default now()
);

-- daily_usage table
create table if not exists public.daily_usage (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.profiles(id) on delete cascade,
  date date not null default current_date,
  query_count integer default 0,
  email_report_count integer default 0,
  unique(profile_id, date)
);

-- prevent duplicate trials on same POS merchant ID
create unique index if not exists profiles_pos_merchant_id_idx on public.profiles(pos_merchant_id) where pos_merchant_id is not null;
