-- HighWise v0.3 — Migration 002
-- countries: master list of supported countries.
-- v0.3 public app shows Nepal only, but the schema is country-ready for future expansion.

create table public.countries (
  id           uuid    primary key default gen_random_uuid(),
  country_code text    unique not null,  -- e.g. 'nepal'
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

-- Authenticated admin users can read all countries.
create policy "countries_select_authenticated"
  on public.countries for select
  to authenticated
  using (true);
