-- HighWise v0.3 — Migration 003
-- treks: trekking routes within a country.
-- trek_id is a stable slug (e.g. 'everest_base_camp') that matches the existing
-- nepalData.ts identifiers and the value stored in nativ_user_profile.tripContext.trekId.

create table public.treks (
  id           uuid    primary key default gen_random_uuid(),
  country_id   uuid    not null references public.countries(id) on delete restrict,
  trek_id      text    unique not null,  -- stable slug; must not be changed after publish
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
