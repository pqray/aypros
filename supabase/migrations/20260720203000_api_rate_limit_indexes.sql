create index if not exists ai_generations_org_created_idx
  on public.ai_generations (organization_id, created_at desc);

create index if not exists website_audits_org_created_idx
  on public.website_audits (organization_id, created_at desc);

create index if not exists activities_org_type_created_idx
  on public.activities (organization_id, type, created_at desc);
