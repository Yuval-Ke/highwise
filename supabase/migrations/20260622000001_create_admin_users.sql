-- HighWise v0.3 — Migration 001
-- admin_users: maps 1:1 to Supabase auth.users; controls dashboard access.
-- The id is the same UUID issued by Supabase Auth, so no separate auth table is needed.

create table public.admin_users (
  id           uuid      primary key references auth.users(id) on delete cascade,
  email        text      unique not null,
  role         text      not null check (role in ('owner', 'admin')),
  is_active    boolean   not null default true,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Shared trigger function used by all tables with an updated_at column.
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

-- Row Level Security
alter table public.admin_users enable row level security;

-- An admin user can read their own row (needed for role checks in the browser).
-- All mutations go through server-side API routes using the service_role key,
-- which bypasses RLS entirely — no client mutation policies are needed.
create policy "admin_users_select_own"
  on public.admin_users for select
  to authenticated
  using (auth.uid() = id);
