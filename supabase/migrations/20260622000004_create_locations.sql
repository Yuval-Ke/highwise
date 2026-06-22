-- HighWise v0.3 — Migration 004
-- locations: individual lodging points / villages along a trek route.
-- location_id is a stable slug scoped to a trek (e.g. 'lukla' within EBC).
-- The unique constraint on (trek_id, location_id) prevents duplicate entries
-- within the same trek — one of the Publish validation rules.

create table public.locations (
  id            uuid    primary key default gen_random_uuid(),
  trek_id       uuid    not null references public.treks(id) on delete restrict,
  location_id   text    not null,   -- stable slug within trek
  name_en       text    not null,
  name_he       text    not null,
  aliases       text[]  not null default '{}',
  altitude_m    integer not null,
  route_order   integer not null default 0,
  section       text    not null default '',         -- e.g. 'ascent', 'descent', 'side-trip'
  location_type text    not null default 'village',  -- 'village' | 'camp' | 'pass' | 'junction'
  needs_review  boolean not null default false,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- No duplicate locationId within the same trek
  unique (trek_id, location_id),

  -- Reasonable altitude envelope: 0–9000 m (covers all inhabited altitude on Earth)
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
