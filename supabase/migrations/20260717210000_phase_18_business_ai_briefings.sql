-- Phase 18: saved AI briefing per business.

create table if not exists public.business_ai_briefings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null default 'commercial_briefing' check (kind = 'commercial_briefing'),
  content_json jsonb not null,
  summary text not null,
  model text not null,
  prompt_version text not null,
  source_hash text not null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_ai_briefings_org_business_kind_created_idx
  on public.business_ai_briefings (organization_id, business_id, kind, created_at desc);

drop trigger if exists business_ai_briefings_updated_at on public.business_ai_briefings;
create trigger business_ai_briefings_updated_at
  before update on public.business_ai_briefings
  for each row execute function public.set_updated_at();

alter table public.business_ai_briefings enable row level security;

drop policy if exists "business ai briefings org select" on public.business_ai_briefings;
create policy "business ai briefings org select"
  on public.business_ai_briefings
  for select
  to authenticated
  using (public.is_org_member(organization_id));
