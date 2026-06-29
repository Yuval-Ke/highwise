-- HighWise P4 — Migration: dashboard aggregation function.
-- Replaces the 5000-row JS pull in /admin/dashboard. Aggregates non-deleted
-- assessment_logs in [p_from, p_to] DB-side. Returns one jsonb row shaped like buildStats().
--
-- Tables touched: none (read-only function over public.assessment_logs).
-- RLS: SECURITY INVOKER (default); called by the service-role client which bypasses RLS.

-- Helper: count distinct values of one text column (mirrors the JS countMap:
-- null -> '(none)', sorted by count desc, limited). Column name is a hard-coded
-- literal at every call site (never user input) so %I has no injection surface.
create or replace function public.dash_count(
  p_from timestamptz, p_to timestamptz, p_col text, p_limit int
) returns jsonb
language plpgsql
stable
as $$
declare
  result jsonb;
begin
  execute format($f$
    select coalesce(jsonb_agg(jsonb_build_object('key', k, 'count', c) order by c desc), '[]'::jsonb)
    from (
      select coalesce(%I::text, '(none)') as k, count(*) as c
      from public.assessment_logs
      where deleted_at is null and created_at >= $1 and created_at <= $2
      group by 1 order by 2 desc limit %s
    ) t
  $f$, p_col, p_limit)
  into result
  using p_from, p_to;
  return result;
end;
$$;

create or replace function public.get_dashboard_stats(
  p_from timestamptz,
  p_to   timestamptz
) returns jsonb
language sql
stable
as $$
  with f as (
    select *
    from public.assessment_logs
    where deleted_at is null
      and created_at >= p_from
      and created_at <= p_to
  )
  select jsonb_build_object(
    'total', (select count(*) from f),
    'avgLLS', (select round(avg(lls_score)::numeric, 1) from f where lls_score is not null),
    'respiratoryCount',  (select count(*) from f where respiratory_illness is true),
    'redFlagsCount',     (select count(*) from f where red_flags is not null
                                            and jsonb_array_length(red_flags) > 0),
    'villageLookupCount',(select count(*) from f where village_lookup_used is true),
    'byDay', (
      select coalesce(jsonb_agg(jsonb_build_object('key', d, 'count', c) order by d desc), '[]'::jsonb)
      from (
        select to_char(created_at, 'YYYY-MM-DD') as d, count(*) as c
        from f group by 1 order by 1 desc limit 14
      ) t
    ),
    'riskDist', (
      select coalesce(jsonb_agg(jsonb_build_object('key', lvl, 'count',
        (select count(*) from f where risk_result = lvl))), '[]'::jsonb)
      from unnest(array['green','yellow','orange','red']) as lvl
    ),
    'topTreks',         public.dash_count(p_from, p_to, 'trek_id', 10),
    'datasetVersions',  public.dash_count(p_from, p_to, 'dataset_version', 1000),
    'datasetSources',   public.dash_count(p_from, p_to, 'dataset_source', 1000),
    'deviceSummary',    public.dash_count(p_from, p_to, 'device_category', 1000),
    'browserSummary',   public.dash_count(p_from, p_to, 'browser', 1000)
  );
$$;
