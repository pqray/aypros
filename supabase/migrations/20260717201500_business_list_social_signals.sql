drop function if exists public.get_org_businesses_api(
  uuid,
  text,
  text,
  text,
  integer,
  integer,
  numeric,
  boolean,
  boolean,
  boolean,
  uuid[],
  text,
  text,
  text,
  integer,
  integer
);

create or replace function public.get_org_businesses_api(
  org_id uuid,
  website_filter text default 'all',
  segment_filter text default 'all',
  city_filter text default null,
  min_score integer default null,
  max_score integer default null,
  min_rating numeric default null,
  audited_filter boolean default null,
  in_pipeline_filter boolean default null,
  only_favorites boolean default false,
  business_ids uuid[] default null,
  search_term text default null,
  sort_by text default 'name',
  sort_dir text default 'asc',
  page integer default 1,
  page_size integer default 20
)
returns table (
  business_id uuid,
  name text,
  address text,
  city text,
  state text,
  phone text,
  website_url text,
  social_only boolean,
  instagram_detected boolean,
  social_links boolean,
  segment text,
  link_in_bio boolean,
  delivery_platform boolean,
  menu_online boolean,
  rating numeric,
  review_count integer,
  categories text[],
  score integer,
  score_level public.opportunity_level,
  audited boolean,
  site_down boolean,
  favorited boolean,
  lead_id uuid,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with org_businesses as (
    select distinct sr.business_id
    from public.search_results sr
    join public.searches s on s.id = sr.search_id
    where s.organization_id = org_id
  ),
  enriched as (
    select
      b.id as business_id,
      b.name,
      b.address,
      b.city,
      b.state,
      b.phone,
      b.website_url,
      coalesce((b.raw ->> 'socialOnly')::boolean, (b.raw ->> 'social_only')::boolean, false) as social_only,
      (
        coalesce(latest_audit.detections -> 'instagram' ->> 'state', '') = 'detected'
        or coalesce(b.raw ->> 'socialPlatform', b.raw ->> 'social_platform', b.raw ->> 'websiteUri', '') ilike '%instagram%'
        or coalesce(latest_audit.detections -> 'socialLinks' -> 'evidence' ->> 'links', '') ilike '%instagram.com%'
      ) as instagram_detected,
      coalesce(latest_audit.detections -> 'socialLinks' ->> 'state', '') = 'detected' as social_links,
      coalesce(b.raw ->> 'segment', b.raw ->> 'business_segment', 'other') as segment,
      coalesce(latest_audit.detections -> 'linkInBio' ->> 'state', '') = 'detected' as link_in_bio,
      coalesce(latest_audit.detections -> 'deliveryPlatform' ->> 'state', '') = 'detected' as delivery_platform,
      coalesce(latest_audit.detections -> 'menuOnline' ->> 'state', '') = 'detected' as menu_online,
      b.rating,
      b.review_count,
      b.categories,
      latest_score.score,
      latest_score.level as score_level,
      (latest_audit.id is not null) as audited,
      coalesce(latest_audit.detections -> 'siteDown' ->> 'state', '') = 'detected' as site_down,
      (fav.business_id is not null) as favorited,
      lead.id as lead_id
    from public.businesses b
    join org_businesses ob on ob.business_id = b.id
    left join lateral (
      select os.score, os.level
      from public.opportunity_scores os
      where os.business_id = b.id
      order by os.created_at desc
      limit 1
    ) latest_score on true
    left join lateral (
      select wa.id, wa.detections
      from public.website_audits wa
      where wa.business_id = b.id
        and wa.organization_id = org_id
      order by wa.created_at desc
      limit 1
    ) latest_audit on true
    left join public.favorites fav
      on fav.organization_id = org_id and fav.business_id = b.id
    left join public.leads lead
      on lead.organization_id = org_id and lead.business_id = b.id
  )
  select e.*, count(*) over () as total_count
  from enriched e
  where (business_ids is null or e.business_id = any (business_ids))
    and (not only_favorites or e.favorited)
    and (website_filter <> 'with_site' or e.website_url is not null)
    and (website_filter <> 'without_site' or e.website_url is null)
    and (segment_filter is null or segment_filter = 'all' or e.segment = segment_filter)
    and (
      city_filter is null
      or e.city ilike '%' || replace(replace(replace(city_filter, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
    and (min_score is null or e.score >= min_score)
    and (max_score is null or e.score <= max_score)
    and (min_rating is null or e.rating >= min_rating)
    and (audited_filter is null or e.audited = audited_filter)
    and (in_pipeline_filter is null or (e.lead_id is not null) = in_pipeline_filter)
    and (
      search_term is null
      or e.name ilike '%' || replace(replace(replace(search_term, '\', '\\'), '%', '\%'), '_', '\_') || '%'
    )
  order by
    case when sort_by = 'name' and sort_dir = 'asc' then e.name end asc,
    case when sort_by = 'name' and sort_dir = 'desc' then e.name end desc,
    case when sort_by = 'score' and sort_dir = 'asc' then e.score end asc nulls first,
    case when sort_by = 'score' and sort_dir = 'desc' then e.score end desc nulls last,
    case when sort_by = 'rating' and sort_dir = 'asc' then e.rating end asc nulls first,
    case when sort_by = 'rating' and sort_dir = 'desc' then e.rating end desc nulls last,
    e.name asc
  limit greatest(coalesce(page_size, 20), 1)
  offset greatest(coalesce(page, 1) - 1, 0) * greatest(coalesce(page_size, 20), 1)
$$;
