-- Fase 19: copiloto de contato (ai_kind novo + link ai_generations -> leads).
-- Fase 22: motivo de perda + get_pipeline_leads atualizada.

alter type public.ai_kind add value if not exists 'contact_copilot';

alter table public.ai_generations
  add column if not exists lead_id uuid null references public.leads(id) on delete set null;

create index if not exists ai_generations_lead_id_idx on public.ai_generations (lead_id);

alter table public.leads
  add column if not exists lost_reason text null;

drop function if exists public.get_pipeline_leads(uuid, uuid);

create function public.get_pipeline_leads(
  org_id uuid,
  assigned_user_id uuid default null
)
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  city text,
  state text,
  website_url text,
  stage public.lead_stage,
  status public.lead_status,
  potential_value numeric,
  next_action text,
  next_action_at timestamptz,
  last_contact_at timestamptz,
  "position" integer,
  score integer,
  score_level public.opportunity_level,
  assigned_to uuid,
  assigned_to_name text,
  assigned_to_avatar_url text,
  domain_cost_annual numeric,
  hosting_cost_monthly numeric,
  margin_target_percent numeric,
  estimated_monthly_cost numeric,
  suggested_maintenance_value numeric,
  lost_reason text,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    l.id,
    b.id as business_id,
    b.name as business_name,
    b.city,
    b.state,
    b.website_url,
    l.stage,
    l.status,
    l.potential_value,
    l.next_action,
    l.next_action_at,
    l.last_contact_at,
    l.position,
    latest_score.score,
    latest_score.level as score_level,
    l.assigned_to,
    assignee.full_name as assigned_to_name,
    assignee.avatar_url as assigned_to_avatar_url,
    l.domain_cost_annual,
    l.hosting_cost_monthly,
    l.margin_target_percent,
    l.estimated_monthly_cost,
    l.suggested_maintenance_value,
    l.lost_reason,
    l.created_at
  from public.leads l
  join public.businesses b on b.id = l.business_id
  left join public.profiles assignee on assignee.id = l.assigned_to
  left join lateral (
    select os.score, os.level
    from public.opportunity_scores os
    where os.business_id = l.business_id
    order by os.created_at desc
    limit 1
  ) latest_score on true
  where l.organization_id = org_id
    and public.is_org_member(org_id)
    and l.status in ('active', 'won', 'lost')
    and (assigned_user_id is null or l.assigned_to = assigned_user_id)
  order by l.position asc;
$$;
