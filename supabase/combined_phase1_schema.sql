-- ============================================================
-- HighWise v0.3 — Phase 1 combined schema
-- Generated from migrations 001–010 in dependency order.
-- Paste this entire file into:
--   Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================


-- ── 001: admin_users ─────────────────────────────────────────

create table public.admin_users (
  id           uuid      primary key references auth.users(id) on delete cascade,
  email        text      unique not null,
  role         text      not null check (role in ('owner', 'admin')),
  is_active    boolean   not null default true,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger admin_users_updated_at
  before update on public.admin_users
  for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;

create policy "admin_users_select_own"
  on public.admin_users for select
  to authenticated
  using (auth.uid() = id);


-- ── 002: countries ───────────────────────────────────────────

create table public.countries (
  id           uuid    primary key default gen_random_uuid(),
  country_code text    unique not null,
  name_en      text    not null,
  name_he      text    not null,
  is_active    boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger countries_updated_at
  before update on public.countries
  for each row execute function public.set_updated_at();

alter table public.countries enable row level security;

create policy "countries_select_authenticated"
  on public.countries for select
  to authenticated
  using (true);


-- ── 003: treks ───────────────────────────────────────────────

create table public.treks (
  id           uuid    primary key default gen_random_uuid(),
  country_id   uuid    not null references public.countries(id) on delete restrict,
  trek_id      text    unique not null,
  name_en      text    not null,
  name_he      text    not null,
  aliases      text[]  not null default '{}',
  region       text    not null default '',
  is_popular   boolean not null default false,
  is_active    boolean not null default true,
  needs_review boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index treks_country_id on public.treks (country_id);

create trigger treks_updated_at
  before update on public.treks
  for each row execute function public.set_updated_at();

alter table public.treks enable row level security;

create policy "treks_select_authenticated"
  on public.treks for select
  to authenticated
  using (true);


-- ── 004: locations ───────────────────────────────────────────

create table public.locations (
  id            uuid    primary key default gen_random_uuid(),
  trek_id       uuid    not null references public.treks(id) on delete restrict,
  location_id   text    not null,
  name_en       text    not null,
  name_he       text    not null,
  aliases       text[]  not null default '{}',
  altitude_m    integer not null,
  route_order   integer not null default 0,
  section       text    not null default '',
  location_type text    not null default 'village',
  needs_review  boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  unique (trek_id, location_id),

  constraint altitude_range check (altitude_m >= 0 and altitude_m <= 9000)
);

create index locations_trek_id on public.locations (trek_id);

create trigger locations_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

alter table public.locations enable row level security;

create policy "locations_select_authenticated"
  on public.locations for select
  to authenticated
  using (true);


-- ── 005: app_config ──────────────────────────────────────────

create table public.app_config (
  id           uuid    primary key default gen_random_uuid(),
  key          text    unique not null,
  value        jsonb   not null,
  description  text,
  is_sensitive boolean not null default false,
  updated_by   uuid    references public.admin_users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger app_config_updated_at
  before update on public.app_config
  for each row execute function public.set_updated_at();

alter table public.app_config enable row level security;

create policy "app_config_select_authenticated"
  on public.app_config for select
  to authenticated
  using (true);


-- ── 006: dataset_versions ────────────────────────────────────

create table public.dataset_versions (
  id              uuid   primary key default gen_random_uuid(),
  dataset_version text   not null,
  schema_version  text   not null default '1',
  payload_json    jsonb  not null,
  is_current      boolean not null default false,
  published_at    timestamptz,
  published_by    uuid   references public.admin_users(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now()
);

create unique index dataset_versions_single_current
  on public.dataset_versions (is_current)
  where is_current = true;

alter table public.dataset_versions enable row level security;

create policy "dataset_versions_select_authenticated"
  on public.dataset_versions for select
  to authenticated
  using (true);


-- ── 007: assessment_logs ─────────────────────────────────────

create table public.assessment_logs (
  id            uuid  primary key default gen_random_uuid(),

  install_id    text  not null,
  session_id    text  not null unique,

  created_at    timestamptz not null default now(),
  completed_at  timestamptz,

  flow_completed   boolean not null default false,
  abandonment_step text,

  app_version      text    not null,
  dataset_version  text,
  config_version   text,
  interface_language text  not null default 'he',
  dataset_source   text    not null default 'bundled'
                           check (dataset_source in ('synced', 'cached', 'bundled')),
  was_offline      boolean not null default false,

  device_category  text,
  browser          text,
  os               text,

  country_id         text,
  trek_id            text,
  location_id        text,
  altitude_source    text    check (altitude_source in (
                               'none', 'manual', 'village_lookup',
                               'device_current_location', 'device_tracking'
                             )),
  village_lookup_used boolean not null default false,

  altitude_current_m      integer,
  altitude_planned_m      integer,
  altitude_last_night_m   integer,
  altitude_2_nights_ago_m integer,
  altitude_3_nights_ago_m integer,

  lls_score       integer,
  lls_severity    text,
  symptom_headache  integer check (symptom_headache  between 0 and 3),
  symptom_fatigue   integer check (symptom_fatigue   between 0 and 3),
  symptom_dizziness integer check (symptom_dizziness between 0 and 3),
  symptom_gi        integer check (symptom_gi        between 0 and 3),
  red_flags         jsonb,
  respiratory_illness boolean,

  risk_result text check (risk_result in ('green', 'yellow', 'orange', 'red')),

  screen_times_json jsonb,

  location_permission_status     text,
  location_used                  boolean,
  location_source                text    check (location_source in (
                                            'none', 'manual', 'village_lookup',
                                            'device_current_location', 'device_tracking'
                                          )),
  device_altitude_meters         numeric,
  device_altitude_accuracy_meters numeric,
  device_latitude                numeric,
  device_longitude               numeric,
  device_location_accuracy_meters numeric,
  device_location_timestamp      timestamptz,
  ascent_tracking_enabled        boolean,
  ascent_rate_estimated          numeric,
  ascent_profile_summary         jsonb,

  synced_at     timestamptz,
  sync_attempts integer not null default 0,

  deleted_at    timestamptz
);

create index assessment_logs_install_id  on public.assessment_logs (install_id);
create index assessment_logs_created_at  on public.assessment_logs (created_at);
create index assessment_logs_risk_result on public.assessment_logs (risk_result) where risk_result is not null;
create index assessment_logs_deleted_at  on public.assessment_logs (deleted_at)  where deleted_at is null;

alter table public.assessment_logs enable row level security;


-- ── 008: sync_logs ───────────────────────────────────────────

create table public.sync_logs (
  id                     uuid primary key default gen_random_uuid(),
  install_id             text not null,
  sync_type              text not null check (sync_type in ('config', 'dataset', 'assessment_logs')),
  started_at             timestamptz not null default now(),
  completed_at           timestamptz,
  success                boolean,
  error_message          text,
  records_sent           integer,
  duration_ms            integer,
  dataset_version_before text,
  dataset_version_after  text
);

create index sync_logs_install_id on public.sync_logs (install_id);
create index sync_logs_started_at on public.sync_logs (started_at);
create index sync_logs_sync_type  on public.sync_logs (sync_type);

alter table public.sync_logs enable row level security;


-- ── 009: audit_logs ──────────────────────────────────────────

create table public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  performed_by uuid references public.admin_users(id) on delete set null,
  performed_at timestamptz not null default now(),
  action_type  text not null check (action_type in (
    'publish_dataset',
    'app_disable',
    'app_enable',
    'config_change',
    'export',
    'soft_delete',
    'altitude_change',
    'record_status_change',
    'admin_user_change'
  )),
  entity_type  text,
  entity_id    text,
  old_value    jsonb,
  new_value    jsonb,
  notes        text
);

create index audit_logs_performed_at on public.audit_logs (performed_at);
create index audit_logs_action_type  on public.audit_logs (action_type);
create index audit_logs_performed_by on public.audit_logs (performed_by) where performed_by is not null;

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_authenticated"
  on public.audit_logs for select
  to authenticated
  using (true);


-- ── 010: seed ────────────────────────────────────────────────

insert into public.app_config (key, value, description, is_sensitive) values
  ('schema_version',    '"1"'::jsonb,
   'Config schema version; increment when shape of PublicAppConfig changes.', false),

  ('config_version',    '"1.0.0"'::jsonb,
   'Config document version; increment on every change so clients know to refresh.', false),

  ('dataset_version',   '"0.0.0"'::jsonb,
   'Version of the currently published dataset snapshot.', false),

  ('sync_enabled',      'true'::jsonb,
   'Whether dataset sync is enabled app-wide.', false),

  ('sync_interval',     '3600'::jsonb,
   'Dataset sync check interval in seconds.', false),

  ('maintenance_mode',    'false'::jsonb,
   'Show a maintenance banner to users; does not block app use.', false),

  ('maintenance_message', 'null'::jsonb,
   'Text of the maintenance banner; null when maintenance_mode is false.', false),

  ('app_disabled',      'false'::jsonb,
   'Hard-blocks the entire app when true. Only the Owner role may change this.', true),

  ('disabled_message',  'null'::jsonb,
   'Optional override for the disabled screen message; null uses the built-in Hebrew default.', true),

  ('min_supported_version', '"0.1.0"'::jsonb,
   'Minimum app version that may run. Enforced only when a fresh config was received.', true),

  ('payment_mode',      '"disabled"'::jsonb,
   'Payment mode: disabled | trial | premium. Disabled in v0.3.', true),

  ('location_enabled',  'false'::jsonb,
   'Master switch for all device location features.', false),

  ('current_altitude_from_location_enabled', 'false'::jsonb,
   'Allow the app to read device GPS altitude for the current-altitude field.', false),

  ('ascent_tracking_enabled', 'false'::jsonb,
   'Enable continuous ascent rate tracking in the background.', false),

  ('send_location_data_enabled', 'false'::jsonb,
   'Send raw device location data to the server when tracking is active.', true)
;

insert into public.countries (country_code, name_en, name_he, is_active, sort_order)
values ('nepal', 'Nepal', 'נפאל', true, 1);
