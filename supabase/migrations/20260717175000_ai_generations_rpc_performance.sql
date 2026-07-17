create or replace function public.get_business_ai_generations_api(
  target_business_id uuid,
  org_id uuid,
  result_limit integer default 12
)
returns table (
  id uuid,
  kind public.ai_kind,
  status public.process_status,
  output jsonb,
  model text,
  tokens_used integer,
  prompt_version text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with authorized_business as (
    select sr.business_id
    from public.search_results sr
    join public.searches s on s.id = sr.search_id
    where sr.business_id = target_business_id
      and s.organization_id = org_id
    limit 1
  )
  select
    ag.id,
    ag.kind,
    ag.status,
    ag.output,
    ag.model,
    ag.tokens_used,
    ag.prompt_version,
    ag.created_at
  from authorized_business ab
  join public.ai_generations ag
    on ag.organization_id = org_id
   and ag.business_id = ab.business_id
  order by ag.created_at desc
  limit greatest(coalesce(result_limit, 12), 1)
$$;
