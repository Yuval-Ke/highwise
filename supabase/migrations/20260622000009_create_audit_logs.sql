-- HighWise v0.3 — Migration 009
-- audit_logs: immutable record of sensitive admin actions.
-- Written by server-side API routes on every sensitive operation.
-- Readable by all authenticated admin users; only the Owner can trigger most actions.

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
  entity_type  text,   -- 'dataset' | 'location' | 'trek' | 'country' | 'admin_user' | 'assessment_log' | 'config'
  entity_id    text,   -- UUID or slug of the affected entity
  old_value    jsonb,
  new_value    jsonb,
  notes        text
);

create index audit_logs_performed_at on public.audit_logs (performed_at);
create index audit_logs_action_type  on public.audit_logs (action_type);
create index audit_logs_performed_by on public.audit_logs (performed_by) where performed_by is not null;

alter table public.audit_logs enable row level security;

-- Authenticated admin users can read all audit logs (writes go through service_role).
create policy "audit_logs_select_authenticated"
  on public.audit_logs for select
  to authenticated
  using (true);
