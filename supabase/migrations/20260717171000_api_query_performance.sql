create index if not exists search_results_search_position_idx
  on public.search_results (search_id, position);

create index if not exists search_results_business_idx
  on public.search_results (business_id);

create index if not exists saved_filters_org_created_idx
  on public.saved_filters (organization_id, created_at desc);

create index if not exists leads_org_status_position_idx
  on public.leads (organization_id, status, position);

create index if not exists website_audits_org_business_created_idx
  on public.website_audits (organization_id, business_id, created_at desc);

create index if not exists ai_generations_org_business_created_idx
  on public.ai_generations (organization_id, business_id, created_at desc);

create or replace function public.get_search_results_page(
  target_search_id uuid,
  org_id uuid,
  website_filter text default 'all',
  sort_by text default 'relevance',
  page integer default 1,
  page_size integer default 20
)
returns table (
  business_id uuid,
  "position" integer,
  name text,
  address text,
  city text,
  state text,
  phone text,
  website_url text,
  rating numeric,
  review_count integer,
  categories text[],
  favorited boolean,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with authorized_search as (
    select s.id
    from public.searches s
    where s.id = target_search_id
      and s.organization_id = org_id
      and public.is_org_member(org_id)
  ),
  enriched as (
    select
      b.id as business_id,
      sr.position,
      b.name,
      b.address,
      b.city,
      b.state,
      b.phone,
      b.website_url,
      b.rating,
      b.review_count,
      b.categories,
      fav.business_id is not null as favorited
    from authorized_search s
    join public.search_results sr on sr.search_id = s.id
    join public.businesses b on b.id = sr.business_id
    left join public.favorites fav
      on fav.organization_id = org_id
     and fav.business_id = b.id
    where (website_filter <> 'with_site' or b.website_url is not null)
      and (website_filter <> 'without_site' or b.website_url is null)
  )
  select e.*, count(*) over () as total_count
  from enriched e
  order by
    case when sort_by = 'relevance' then e.position end asc,
    case when sort_by = 'name' then e.name end asc,
    case when sort_by = 'rating' then e.rating end desc nulls last,
    case when sort_by = 'reviews' then e.review_count end desc nulls last,
    e.position asc
  limit greatest(coalesce(page_size, 20), 1)
  offset greatest(coalesce(page, 1) - 1, 0) * greatest(coalesce(page_size, 20), 1)
$$;
