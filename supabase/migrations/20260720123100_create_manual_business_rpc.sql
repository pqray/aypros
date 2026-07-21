create or replace function public.create_manual_business_api(
  p_org_id uuid,
  p_user_id uuid,
  p_provider_place_id text,
  p_name text,
  p_segment text,
  p_city text,
  p_state text,
  p_phone text,
  p_website_url text,
  p_categories text[],
  p_raw jsonb
)
returns table (
  business_id uuid,
  search_id uuid,
  created boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_search_id uuid;
  v_website_uri text := coalesce(p_raw ->> 'websiteUri', '');
begin
  select b.id, s.id
  into v_business_id, v_search_id
  from public.businesses b
  join public.search_results sr on sr.business_id = b.id
  join public.searches s on s.id = sr.search_id
  where s.organization_id = p_org_id
    and s.provider = 'manual'
    and b.provider = 'manual'
    and lower(b.name) = lower(p_name)
    and coalesce(b.city, '') = coalesce(p_city, '')
    and coalesce(b.state, '') = coalesce(p_state, '')
    and coalesce(b.raw ->> 'manualSegment', '') = coalesce(p_raw ->> 'manualSegment', '')
    and coalesce(b.raw ->> 'websiteUri', '') = v_website_uri
  order by b.created_at desc
  limit 1;

  if v_business_id is not null and v_search_id is not null then
    return query select v_business_id, v_search_id, false;
    return;
  end if;

  insert into public.businesses (
    provider,
    provider_place_id,
    name,
    address,
    city,
    state,
    phone,
    website_url,
    rating,
    review_count,
    categories,
    lat,
    lng,
    raw,
    refreshed_at,
    provider_status
  )
  values (
    'manual',
    p_provider_place_id,
    p_name,
    null,
    nullif(p_city, ''),
    nullif(p_state, ''),
    p_phone,
    p_website_url,
    null,
    null,
    p_categories,
    null,
    null,
    p_raw,
    now(),
    'active'
  )
  returning id into v_business_id;

  insert into public.searches (
    organization_id,
    created_by,
    city,
    state,
    country,
    segment,
    status,
    total_found,
    provider
  )
  values (
    p_org_id,
    p_user_id,
    coalesce(nullif(p_city, ''), 'Manual'),
    coalesce(nullif(p_state, ''), ''),
    'BR',
    p_segment,
    'completed',
    1,
    'manual'
  )
  returning id into v_search_id;

  insert into public.search_results (search_id, business_id, position)
  values (v_search_id, v_business_id, 1);

  insert into public.activities (
    organization_id,
    business_id,
    actor_id,
    type,
    payload
  )
  values (
    p_org_id,
    v_business_id,
    p_user_id,
    'business_created',
    jsonb_build_object(
      'provider', 'manual',
      'search_id', v_search_id,
      'segment', p_segment
    )
  );

  return query select v_business_id, v_search_id, true;
end;
$$;
