create or replace function public.get_business_audit_summary(
  target_business_id uuid,
  org_id uuid
)
returns table (
  business_id uuid,
  business_name text,
  address text,
  city text,
  state text,
  phone text,
  website_url text,
  rating numeric,
  review_count integer,
  categories text[],
  refreshed_at timestamptz,
  provider_status text,
  raw jsonb,
  audit_id uuid,
  audit_status public.process_status,
  final_url text,
  http_status integer,
  response_time_ms integer,
  redirect_count integer,
  is_https boolean,
  detections jsonb,
  evidence jsonb,
  error_code text,
  audit_created_at timestamptz,
  audit_completed_at timestamptz,
  score_id uuid,
  score_audit_id uuid,
  score integer,
  score_level public.opportunity_level,
  score_confidence public.confidence_level,
  reasons jsonb,
  suggested_services jsonb,
  algorithm_version text,
  score_created_at timestamptz,
  favorited boolean,
  lead_id uuid
)
language sql
stable
security invoker
set search_path = public
as $$
  with authorized_business as (
    select b.*
    from public.businesses b
    where b.id = target_business_id
      and public.is_org_member(org_id)
      and exists (
        select 1
        from public.search_results sr
        join public.searches s on s.id = sr.search_id
        where sr.business_id = b.id
          and s.organization_id = org_id
      )
  )
  select
    b.id as business_id,
    b.name as business_name,
    b.address,
    b.city,
    b.state,
    b.phone,
    b.website_url,
    b.rating,
    b.review_count,
    b.categories,
    b.refreshed_at,
    b.provider_status,
    b.raw,
    audit.id as audit_id,
    audit.status as audit_status,
    audit.final_url,
    audit.http_status,
    audit.response_time_ms,
    audit.redirect_count,
    audit.is_https,
    audit.detections,
    audit.evidence,
    audit.error_code,
    audit.created_at as audit_created_at,
    audit.completed_at as audit_completed_at,
    score_row.id as score_id,
    score_row.audit_id as score_audit_id,
    score_row.score,
    score_row.level as score_level,
    score_row.confidence as score_confidence,
    score_row.reasons,
    score_row.suggested_services,
    score_row.algorithm_version,
    score_row.created_at as score_created_at,
    fav.business_id is not null as favorited,
    lead.id as lead_id
  from authorized_business b
  left join lateral (
    select wa.*
    from public.website_audits wa
    where wa.organization_id = org_id
      and wa.business_id = b.id
    order by wa.created_at desc
    limit 1
  ) audit on true
  left join lateral (
    select os.*
    from public.opportunity_scores os
    where os.business_id = b.id
    order by os.created_at desc
    limit 1
  ) score_row on true
  left join public.favorites fav
    on fav.organization_id = org_id
   and fav.business_id = b.id
  left join public.leads lead
    on lead.organization_id = org_id
   and lead.business_id = b.id;
$$;
