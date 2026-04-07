-- Extend the plan check constraint to include 'owner', then seed the owner account.
-- Safe to re-run (DO block is idempotent, constraint drop/add is idempotent).

-- 1. Extend plan constraint to allow 'owner'
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check
  check (plan in ('starter', 'pro', 'business', 'owner'));

-- 2. Seed the owner auth user + profile
do $$
declare
  v_user_id uuid;
begin
  -- Check if the owner auth user already exists
  select id into v_user_id
  from auth.users
  where email = 'daniel@tilltalk.ie'
  limit 1;

  if v_user_id is null then
    -- Create a confirmed auth user with a placeholder password.
    -- Use "Forgot password" at tilltalk.ie/forgot-password to set the real password.
    insert into auth.users (
      id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role
    ) values (
      gen_random_uuid(),
      'daniel@tilltalk.ie',
      extensions.crypt('ChangeMe123!', extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      false,
      'authenticated'
    )
    returning id into v_user_id;

    raise notice 'Owner auth user created: %', v_user_id;
  else
    raise notice 'Owner auth user already exists: %', v_user_id;
  end if;

  -- Upsert the owner profile (no trial, plan = owner)
  insert into public.profiles (
    id,
    email,
    full_name,
    restaurant_name,
    plan,
    trial_start,
    trial_end,
    active
  ) values (
    v_user_id,
    'daniel@tilltalk.ie',
    'Daniel O''Connor',
    'TillTalk',
    'owner',
    null,
    null,
    true
  )
  on conflict (id) do update
    set plan        = 'owner',
        trial_start = null,
        trial_end   = null,
        active      = true;

  raise notice 'Owner profile upserted for user_id: %', v_user_id;
end;
$$;
