-- HighWise v0.3 — Migration 006
-- dataset_versions: immutable snapshots created by the Publish Dataset workflow.
-- Only one row may have is_current=true at any time, enforced by a partial unique index.
-- The public /api/public/dataset endpoint serves payload_json from the current snapshot.
-- Admin edits to treks/locations are never live until a new snapshot is published.

create table public.dataset_versions (
  id              uuid   primary key default gen_random_uuid(),
  dataset_version text   not null,        -- e.g. '1.0.0', '1.1.0'
  schema_version  text   not null default '1',
  payload_json    jsonb  not null,         -- full PublishedDataset snapshot
  is_current      boolean not null default false,
  published_at    timestamptz,
  published_by    uuid   references public.admin_users(id) on delete set null,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Only one published version can be active.
create unique index dataset_versions_single_current
  on public.dataset_versions (is_current)
  where is_current = true;

alter table public.dataset_versions enable row level security;

create policy "dataset_versions_select_authenticated"
  on public.dataset_versions for select
  to authenticated
  using (true);
