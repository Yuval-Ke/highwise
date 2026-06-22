-- HighWise v0.3 — Migration 005
-- app_config: key-value store for Remote Config.
-- is_sensitive=true marks keys that only the Owner role may modify
-- (e.g. app_disabled, min_supported_version, payment_mode, send_location_data_enabled).
-- The public /api/public/config endpoint assembles a PublicAppConfig from these rows.

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
