-- HighWise v0.3 — Migration 008
-- sync_logs: records each sync attempt from a client device.
-- Covers three sync types: config fetch, dataset download, and assessment log upload.
-- Admin can see aggregate sync failures via the System Health panel.

create table public.sync_logs (
  id                     uuid primary key default gen_random_uuid(),
  install_id             text not null,
  sync_type              text not null check (sync_type in ('config', 'dataset', 'assessment_logs')),
  started_at             timestamptz not null default now(),
  completed_at           timestamptz,
  success                boolean,
  error_message          text,
  records_sent           integer,    -- for assessment_logs sync: number of records sent
  duration_ms            integer,
  dataset_version_before text,       -- for dataset sync: version before the update
  dataset_version_after  text        -- for dataset sync: version after the update
);

create index sync_logs_install_id on public.sync_logs (install_id);
create index sync_logs_started_at on public.sync_logs (started_at);
create index sync_logs_sync_type  on public.sync_logs (sync_type);

alter table public.sync_logs enable row level security;

-- All reads/writes via service_role only.
