-- HighWise v0.3 — Migration 007
-- assessment_logs: one row per assessment session (complete or abandoned).
-- Identified by install_id only — no name, email, or phone is ever stored.
-- Medical fields (lls_score, lls_severity, symptoms) are internal; never shown to the public user.
-- Location-ready fields are all nullable; none are populated unless the corresponding
-- Remote Config flags are enabled (all default false in v0.3).
-- Deletion is soft-delete only (set deleted_at); physical deletion is out of scope for v0.3.

create table public.assessment_logs (
  id            uuid  primary key default gen_random_uuid(),

  -- Identity (no PII)
  install_id    text  not null,
  session_id    text  not null unique,

  -- Timestamps
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,

  -- Flow state
  flow_completed   boolean not null default false,
  abandonment_step text,   -- screen name where user stopped, if incomplete

  -- App / dataset context
  app_version      text    not null,
  dataset_version  text,
  config_version   text,
  interface_language text  not null default 'he',
  dataset_source   text    not null default 'bundled'
                           check (dataset_source in ('synced', 'cached', 'bundled')),
  was_offline      boolean not null default false,

  -- Device / environment (coarse categories only)
  device_category  text,   -- 'mobile' | 'tablet' | 'desktop'
  browser          text,
  os               text,

  -- Trek / location context
  country_id         text,
  trek_id            text,
  location_id        text,   -- populated if a village was selected via VillageLookupModal
  altitude_source    text    check (altitude_source in (
                               'none', 'manual', 'village_lookup',
                               'device_current_location', 'device_tracking'
                             )),
  village_lookup_used boolean not null default false,

  -- Entered altitudes (meters)
  altitude_current_m      integer,
  altitude_planned_m      integer,
  altitude_last_night_m   integer,
  altitude_2_nights_ago_m integer,
  altitude_3_nights_ago_m integer,

  -- Internal medical data (never exposed to public user)
  lls_score       integer,
  lls_severity    text,
  symptom_headache  integer check (symptom_headache  between 0 and 3),
  symptom_fatigue   integer check (symptom_fatigue   between 0 and 3),
  symptom_dizziness integer check (symptom_dizziness between 0 and 3),
  symptom_gi        integer check (symptom_gi        between 0 and 3),
  red_flags         jsonb,    -- array of selected red-flag string identifiers
  respiratory_illness boolean,

  -- Result
  risk_result text check (risk_result in ('green', 'yellow', 'orange', 'red')),

  -- UX metrics
  screen_times_json jsonb,  -- { screenName: durationSeconds }

  -- ── Location-ready infrastructure ──────────────────────────────────────────
  -- All nullable; all null in v0.3 (flags are off by default).
  -- Do not populate without explicit user action and matching Remote Config flags.
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

  -- Sync tracking
  synced_at     timestamptz,
  sync_attempts integer not null default 0,

  -- Soft delete (owner only)
  deleted_at    timestamptz
);

create index assessment_logs_install_id  on public.assessment_logs (install_id);
create index assessment_logs_created_at  on public.assessment_logs (created_at);
create index assessment_logs_risk_result on public.assessment_logs (risk_result) where risk_result is not null;
create index assessment_logs_deleted_at  on public.assessment_logs (deleted_at)  where deleted_at is null;

alter table public.assessment_logs enable row level security;

-- No client-side access. All reads/writes go through server-side API routes
-- using the service_role key, which bypasses RLS.
