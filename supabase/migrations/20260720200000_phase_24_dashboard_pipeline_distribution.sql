-- Phase 24: pipeline stage distribution RPC for the dashboard pie chart,
-- replacing the "Hoje" (overdue/today actions) block.
-- security invoker + is_org_member guard, same pattern as the other
-- dashboard aggregates in 20260716130000_phase_05_dashboard_aggregates.sql.

create or replace function public.get_dashboard_pipeline_distribution(org_id uuid)
returns table (
  stage public.lead_stage,
  count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    stages.stage,
    coalesce(counts.count, 0) as count
  from unnest(enum_range(null::public.lead_stage)) as stages(stage)
  left join (
    select l.stage, count(*) as count
    from public.leads l
    where l.organization_id = org_id
    group by l.stage
  ) counts on counts.stage = stages.stage
  where public.is_org_member(org_id)
  order by array_position(enum_range(null::public.lead_stage), stages.stage);
$$;
