-- Migration 009: query_logs table
-- Stores anonymised query/response pairs for AI cost analysis, pattern classification,
-- and the eventual semantic caching + model routing roadmap.
-- Raw query/response auto-deleted after 90 days; anonymised versions retained indefinitely.

create table if not exists public.query_logs (

  -- ── QUERY IDENTIFICATION ────────────────────────────────────────────────
  id                        uuid primary key default gen_random_uuid(),
  client_id                 uuid references public.profiles(id) on delete set null,
  session_id                text,        -- hash(phone_number + date), groups same-day queries
  session_position          integer,     -- 1st, 2nd, 3rd query in session
  created_at                timestamptz not null default now(),

  -- ── QUERY CONTENT ───────────────────────────────────────────────────────
  raw_query                 text,        -- actual query — deleted after 90 days
  anonymised_query          text,        -- [VALUE], [PRODUCT], [DATE_REF] etc. retained indefinitely
  query_length_chars        integer,
  query_token_count         integer,
  was_voice_note            boolean not null default false,
  was_suggested_prompt      boolean not null default false,
  language_detected         text,
  previous_query_id         uuid references public.query_logs(id) on delete set null,
  previous_query_anonymised text,

  -- ── CHANNEL AND CLIENT CONTEXT ──────────────────────────────────────────
  channel                   text not null default 'whatsapp'
                              check (channel in ('whatsapp', 'dashboard')),
  pos_type                  text not null default 'unknown'
                              check (pos_type in ('clover', 'square', 'eposnow', 'unknown')),
  client_plan               text not null default 'trial'
                              check (client_plan in ('trial', 'starter', 'pro', 'business', 'owner')),
  client_location_count     integer,
  client_age_days           integer,
  query_hour                integer check (query_hour between 0 and 23),
  query_day_of_week         integer check (query_day_of_week between 0 and 6),
  query_month               integer check (query_month between 1 and 12),
  has_nearby_event          boolean,
  weather_condition         text,

  -- ── RESPONSE CONTENT ────────────────────────────────────────────────────
  raw_response              text,        -- actual response — deleted after 90 days
  anonymised_response       text,
  response_length_chars     integer,
  response_input_tokens     integer,
  response_output_tokens    integer,
  response_total_cost_eur   float,

  -- ── MODEL AND PERFORMANCE ───────────────────────────────────────────────
  model_used                text not null default 'haiku'
                              check (model_used in ('haiku', 'sonnet', 'opus', 'cache', 'deterministic')),
  model_attempted_first     text
                              check (model_attempted_first in ('haiku', 'sonnet', 'opus', 'cache', 'deterministic', null)),
  was_escalated             boolean not null default false,
  escalated_from            text
                              check (escalated_from in ('haiku', 'sonnet', 'opus', 'cache', 'deterministic', null)),
  cache_hit                 boolean not null default false,
  cache_similarity_score    float,
  response_time_ms          integer,
  pos_api_calls_made        integer,
  pos_endpoints_called      text[],
  pos_api_error             boolean not null default false,
  pos_api_error_message     text,

  -- ── CLASSIFICATION (filled by batch job) ────────────────────────────────
  intent_type               text
                              check (intent_type in (
                                'daily_sales','weekly_sales','monthly_sales','yearly_sales',
                                'period_comparison','top_products','worst_products',
                                'hourly_breakdown','staff_analysis','inventory_check',
                                'event_nearby','weather_alert','reminder_set','reminder_list',
                                'note_set','note_list','payroll_query','location_comparison',
                                'multi_location_merge','custom_report','other',
                                null
                              )),
  intent_sub_type           text,
  intent_confidence         float check (intent_confidence between 0 and 1),
  query_complexity          text
                              check (query_complexity in (
                                'simple_lookup','calculation','comparison',
                                'multi_step','reasoning_required', null
                              )),
  required_date_parsing     boolean,
  required_comparison_logic boolean,
  required_ranking          boolean,
  required_cross_location   boolean,
  required_ai_reasoning     boolean,
  classified_at             timestamptz,

  -- ── QUALITY SIGNALS ─────────────────────────────────────────────────────
  follow_up_within_60s      boolean not null default false,
  follow_up_within_5min     boolean not null default false,
  follow_up_nature          text
                              check (follow_up_nature in (
                                'clarification','correction','positive',
                                'new_topic','gave_up', null
                              )),
  client_expressed_satisfaction  boolean,
  client_expressed_frustration   boolean,
  same_query_repeated_24h        boolean not null default false,
  session_ended_immediately      boolean not null default false,

  -- ── FOR DETERMINISTIC CODE GENERATION ───────────────────────────────────
  calculation_performed     text,
  formatting_applied        text,
  answer_was_purely_data_driven boolean
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────
create index if not exists query_logs_client_id_idx    on public.query_logs (client_id);
create index if not exists query_logs_created_at_idx   on public.query_logs (created_at desc);
create index if not exists query_logs_intent_type_idx  on public.query_logs (intent_type);
create index if not exists query_logs_classified_at_idx on public.query_logs (classified_at) where classified_at is null;
create index if not exists query_logs_channel_idx      on public.query_logs (channel);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.query_logs enable row level security;

-- Users can view their own query logs
create policy "Users can view their own query logs"
  on public.query_logs
  for select
  using (client_id = auth.uid());

-- Service role bypasses RLS — all writes and admin reads use service role.
