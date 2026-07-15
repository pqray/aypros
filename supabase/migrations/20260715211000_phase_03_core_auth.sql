create extension if not exists "pgcrypto";

create type public.process_status as enum ('pending', 'processing', 'completed', 'partial', 'failed');
create type public.member_role as enum ('owner', 'admin', 'member');
create type public.opportunity_level as enum ('low', 'medium', 'high', 'very_high');
create type public.confidence_level as enum ('low', 'medium', 'high');
create type public.lead_stage as enum ('new', 'contacted', 'in_conversation', 'proposal_sent', 'won', 'lost');
create type public.lead_status as enum ('active', 'won', 'lost', 'archived');
create type public.activity_type as enum (
  'search_created',
  'business_favorited',
  'audit_completed',
  'lead_created',
  'lead_stage_changed',
  'note_created',
  'ai_generated',
  'export_created'
);
create type public.ai_kind as enum ('commercial_summary', 'whatsapp_message', 'email_message');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  city text not null,
  state text not null,
  country text not null default 'BR',
  segment text not null,
  status public.process_status not null default 'pending',
  total_found integer not null default 0,
  error_message text,
  provider text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_place_id text not null,
  name text not null,
  address text,
  city text,
  state text,
  phone text,
  website_url text,
  rating numeric,
  review_count integer,
  categories text[] not null default '{}',
  lat numeric,
  lng numeric,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_place_id)
);

create table public.search_results (
  search_id uuid not null references public.searches(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  position integer not null,
  primary key (search_id, business_id)
);

create table public.favorites (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (organization_id, business_id)
);

create table public.saved_filters (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.website_audits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  status public.process_status not null default 'pending',
  final_url text,
  http_status integer,
  response_time_ms integer,
  redirect_count integer,
  is_https boolean,
  detections jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.opportunity_scores (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  audit_id uuid references public.website_audits(id) on delete set null,
  score integer not null check (score >= 0 and score <= 100),
  level public.opportunity_level not null,
  confidence public.confidence_level not null,
  reasons jsonb not null default '[]'::jsonb,
  suggested_services jsonb not null default '[]'::jsonb,
  algorithm_version text not null,
  created_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete restrict,
  stage public.lead_stage not null default 'new',
  status public.lead_status not null default 'active',
  potential_value numeric,
  next_action text,
  next_action_at timestamptz,
  position integer not null default 0,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, business_id)
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.activity_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  requested_by uuid not null references public.profiles(id) on delete restrict,
  kind public.ai_kind not null,
  prompt_version text not null,
  input jsonb not null,
  output jsonb,
  model text not null,
  tokens_used integer,
  status public.process_status not null default 'pending',
  created_at timestamptz not null default now()
);

create index searches_org_created_idx on public.searches (organization_id, created_at desc);
create index website_audits_business_created_idx on public.website_audits (business_id, created_at desc);
create index opportunity_scores_business_created_idx on public.opportunity_scores (business_id, created_at desc);
create index activities_org_created_idx on public.activities (organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger searches_updated_at before update on public.searches for each row execute function public.set_updated_at();
create trigger businesses_updated_at before update on public.businesses for each row execute function public.set_updated_at();
create trigger saved_filters_updated_at before update on public.saved_filters for each row execute function public.set_updated_at();
create trigger leads_updated_at before update on public.leads for each row execute function public.set_updated_at();
create trigger notes_updated_at before update on public.notes for each row execute function public.set_updated_at();

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.has_org_role(target_org_id uuid, allowed_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
      and role = any(allowed_roles)
  );
$$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.searches enable row level security;
alter table public.businesses enable row level security;
alter table public.search_results enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_filters enable row level security;
alter table public.website_audits enable row level security;
alter table public.opportunity_scores enable row level security;
alter table public.leads enable row level security;
alter table public.notes enable row level security;
alter table public.activities enable row level security;
alter table public.ai_generations enable row level security;

create policy "profiles self select" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles self insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles self update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "organizations member select" on public.organizations for select to authenticated using (public.is_org_member(id) or created_by = auth.uid());
create policy "organizations authenticated insert" on public.organizations for insert to authenticated with check (created_by = auth.uid());
create policy "organizations owner admin update" on public.organizations for update to authenticated using (public.has_org_role(id, array['owner','admin']::public.member_role[]));

create policy "members member select" on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy "members self insert" on public.organization_members for insert to authenticated with check (user_id = auth.uid() or public.has_org_role(organization_id, array['owner']::public.member_role[]));
create policy "members owner update" on public.organization_members for update to authenticated using (public.has_org_role(organization_id, array['owner']::public.member_role[]));
create policy "members owner delete" on public.organization_members for delete to authenticated using (public.has_org_role(organization_id, array['owner']::public.member_role[]));

create policy "businesses authenticated select" on public.businesses for select to authenticated using (true);
create policy "opportunity scores authenticated select" on public.opportunity_scores for select to authenticated using (true);

create policy "searches org all" on public.searches for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "search results member select" on public.search_results for select to authenticated using (
  exists (select 1 from public.searches where searches.id = search_id and public.is_org_member(searches.organization_id))
);
create policy "favorites org all" on public.favorites for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "saved filters org all" on public.saved_filters for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "website audits org select" on public.website_audits for select to authenticated using (public.is_org_member(organization_id));
create policy "leads org all" on public.leads for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "notes org all" on public.notes for all to authenticated using (public.is_org_member(organization_id)) with check (public.is_org_member(organization_id));
create policy "activities org select" on public.activities for select to authenticated using (public.is_org_member(organization_id));
create policy "ai generations org select" on public.ai_generations for select to authenticated using (public.is_org_member(organization_id));
