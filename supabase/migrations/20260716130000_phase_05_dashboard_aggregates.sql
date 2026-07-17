-- Phase 05: dashboard aggregate RPCs.
-- security invoker: RLS on the underlying tables still applies; the explicit
-- is_org_member(org_id) guard keeps results scoped to the requested org even
-- when the caller belongs to multiple organizations.

create or replace function public.get_dashboard_metrics(org_id uuid)
returns table (
  searches_count bigint,
  businesses_count bigint,
  businesses_without_website_count bigint,
  active_leads_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    (
      select count(*)
      from public.searches s
      where s.organization_id = org_id
    ) as searches_count,
    (
      select count(distinct sr.business_id)
      from public.search_results sr
      join public.searches s on s.id = sr.search_id
      where s.organization_id = org_id
    ) as businesses_count,
    (
      select count(distinct sr.business_id)
      from public.search_results sr
      join public.searches s on s.id = sr.search_id
      join public.businesses b on b.id = sr.business_id
      where s.organization_id = org_id
        and coalesce(b.website_url, '') = ''
    ) as businesses_without_website_count,
    (
      select count(*)
      from public.leads l
      where l.organization_id = org_id
        and l.status = 'active'
    ) as active_leads_count
  where public.is_org_member(org_id);
$$;

create or replace function public.get_dashboard_opportunities(org_id uuid, max_items integer default 5)
returns table (
  business_id uuid,
  business_name text,
  city text,
  state text,
  score integer,
  level public.opportunity_level,
  main_reason text
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    b.id as business_id,
    b.name as business_name,
    b.city,
    b.state,
    latest_score.score,
    latest_score.level,
    latest_score.reasons ->> 0 as main_reason
  from public.businesses b
  join lateral (
    select os.score, os.level, os.reasons
    from public.opportunity_scores os
    where os.business_id = b.id
    order by os.created_at desc
    limit 1
  ) latest_score on true
  where public.is_org_member(org_id)
    and latest_score.level in ('high', 'very_high')
    and exists (
      select 1
      from public.search_results sr
      join public.searches s on s.id = sr.search_id
      where sr.business_id = b.id
        and s.organization_id = org_id
    )
    and not exists (
      select 1
      from public.leads l
      where l.business_id = b.id
        and l.organization_id = org_id
    )
  order by latest_score.score desc, b.name asc
  limit greatest(coalesce(max_items, 5), 0);
$$;
