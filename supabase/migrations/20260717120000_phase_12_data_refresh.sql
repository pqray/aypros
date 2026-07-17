-- Phase 12: data freshness fields and refresh candidate selection.

alter type public.activity_type add value if not exists 'data_refresh_requested';

alter table public.businesses
  add column if not exists refreshed_at timestamptz,
  add column if not exists provider_status text not null default 'active';

alter table public.businesses
  add constraint businesses_provider_status_check
  check (provider_status in ('active', 'removed', 'error'))
  not valid;

alter table public.businesses validate constraint businesses_provider_status_check;

create index if not exists businesses_refreshed_at_idx
  on public.businesses (refreshed_at asc nulls first)
  where provider_status = 'active';

create index if not exists businesses_provider_status_idx
  on public.businesses (provider_status);

create or replace function public.get_refresh_candidates(
  places_stale_before timestamptz,
  audit_stale_before timestamptz,
  max_rows integer default 10
)
returns table (
  business_id uuid,
  organization_id uuid,
  user_id uuid,
  provider_place_id text,
  refreshed_at timestamptz,
  last_audit_at timestamptz,
  needs_places boolean,
  needs_audit boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with active_refs as (
    select f.business_id, f.organization_id, f.created_by as user_id
    from public.favorites f
    union all
    select l.business_id, l.organization_id, l.created_by as user_id
    from public.leads l
    where l.status = 'active'
  ),
  scoped as (
    select distinct on (ar.business_id, ar.organization_id)
      ar.business_id,
      ar.organization_id,
      ar.user_id
    from active_refs ar
    where ar.user_id is not null
    order by ar.business_id, ar.organization_id
  ),
  enriched as (
    select
      b.id as business_id,
      s.organization_id,
      s.user_id,
      b.provider_place_id,
      b.refreshed_at,
      latest_audit.created_at as last_audit_at,
      (b.refreshed_at is null or b.refreshed_at < places_stale_before) as needs_places,
      (
        b.website_url is not null
        and (latest_audit.created_at is null or latest_audit.created_at < audit_stale_before)
      ) as needs_audit
    from scoped s
    join public.businesses b on b.id = s.business_id
    left join lateral (
      select wa.created_at
      from public.website_audits wa
      where wa.business_id = b.id
        and wa.organization_id = s.organization_id
      order by wa.created_at desc
      limit 1
    ) latest_audit on true
    where b.provider_status = 'active'
  )
  select *
  from enriched
  where needs_places or needs_audit
  order by
    refreshed_at asc nulls first,
    last_audit_at asc nulls first,
    business_id
  limit greatest(coalesce(max_rows, 10), 1)
$$;
