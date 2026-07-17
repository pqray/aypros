create extension if not exists pg_trgm;

create index if not exists businesses_name_trgm_idx
  on public.businesses using gin (name gin_trgm_ops);

create index if not exists businesses_city_trgm_idx
  on public.businesses using gin (city gin_trgm_ops);

create index if not exists businesses_segment_expr_idx
  on public.businesses ((coalesce(raw ->> 'segment', raw ->> 'business_segment', 'other')));

create index if not exists leads_org_stage_position_idx
  on public.leads (organization_id, stage, position);

create index if not exists leads_org_business_idx
  on public.leads (organization_id, business_id);

create index if not exists notes_org_lead_created_idx
  on public.notes (organization_id, lead_id, created_at desc);

create index if not exists activities_org_lead_created_idx
  on public.activities (organization_id, lead_id, created_at desc);
