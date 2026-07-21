-- Fase 21: schema `ayhub` estava em português (ADR 014), desviando de
-- 00-project-rules.md §3 (código em inglês). Projeto ainda em desenvolvimento
-- (sem dado real) — recriar do zero em inglês em vez de carregar a exceção
-- pra frente. Ver ADR 015 (substitui ADR 014).

drop schema if exists ayhub cascade;

create schema ayhub;

create type ayhub.client_status as enum ('active', 'inactive', 'delinquent');
create type ayhub.client_origin as enum ('pipeline', 'manual');
create type ayhub.site_status as enum ('live', 'maintenance', 'paused');
create type ayhub.owner as enum ('me', 'client');
create type ayhub.cost_type as enum ('domain', 'hosting', 'storage', 'other');
create type ayhub.frequency as enum ('monthly', 'yearly', 'once');
create type ayhub.content_block_type as enum ('text', 'image', 'list');
create type ayhub.content_block_status as enum ('draft', 'published');

create table ayhub.clients (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  contact text,
  maintenance_value numeric,
  status ayhub.client_status not null default 'active',
  start_date timestamptz not null default now(),
  origin ayhub.client_origin not null,
  origin_lead_id uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ayhub_clients_org_idx on ayhub.clients (organization_id);

create table ayhub.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references ayhub.clients(id) on delete restrict,
  slug text not null unique,
  domain text,
  domain_owner ayhub.owner not null default 'me',
  delivery_date timestamptz,
  status ayhub.site_status not null default 'live',
  created_at timestamptz not null default now()
);

create index ayhub_sites_org_idx on ayhub.sites (organization_id);
create index ayhub_sites_client_idx on ayhub.sites (client_id);

create table ayhub.site_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references ayhub.sites(id) on delete cascade,
  key_hash text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create index ayhub_site_keys_org_idx on ayhub.site_keys (organization_id);
create index ayhub_site_keys_site_idx on ayhub.site_keys (site_id);
create unique index ayhub_site_keys_hash_idx on ayhub.site_keys (key_hash);

create table ayhub.site_costs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references ayhub.sites(id) on delete cascade,
  type ayhub.cost_type not null,
  amount numeric not null,
  frequency ayhub.frequency not null,
  next_renewal date,
  payment_owner ayhub.owner not null default 'me',
  created_at timestamptz not null default now()
);

create index ayhub_site_costs_org_idx on ayhub.site_costs (organization_id);
create index ayhub_site_costs_site_idx on ayhub.site_costs (site_id);

create table ayhub.content_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references ayhub.sites(id) on delete cascade,
  key text not null,
  type ayhub.content_block_type not null default 'text',
  draft_value jsonb,
  published_value jsonb,
  status ayhub.content_block_status not null default 'draft',
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (site_id, key)
);

create index ayhub_content_blocks_org_idx on ayhub.content_blocks (organization_id);
create index ayhub_content_blocks_site_idx on ayhub.content_blocks (site_id);

create table ayhub.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references ayhub.clients(id) on delete cascade,
  amount numeric not null,
  date date not null,
  created_at timestamptz not null default now()
);

create index ayhub_payments_org_idx on ayhub.payments (organization_id);
create index ayhub_payments_client_idx on ayhub.payments (client_id);

-- RLS: só membros owner/admin da organização acessam o AYhub.
alter table ayhub.clients enable row level security;
alter table ayhub.sites enable row level security;
alter table ayhub.site_keys enable row level security;
alter table ayhub.site_costs enable row level security;
alter table ayhub.content_blocks enable row level security;
alter table ayhub.payments enable row level security;

create policy "ayhub clients owner admin all" on ayhub.clients for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub sites owner admin all" on ayhub.sites for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub site_keys owner admin all" on ayhub.site_keys for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub site_costs owner admin all" on ayhub.site_costs for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub content_blocks owner admin all" on ayhub.content_blocks for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub payments owner admin all" on ayhub.payments for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- PostgREST só atende schemas na lista "Exposed schemas" do projeto — já
-- configurado manualmente no Dashboard (fase 20/21), sobrevive ao drop/recreate
-- do schema porque é uma configuração do projeto, não do schema em si.
grant usage on schema ayhub to authenticated, service_role;
grant select, insert, update, delete on all tables in schema ayhub to authenticated, service_role;
alter default privileges in schema ayhub
  grant select, insert, update, delete on tables to authenticated, service_role;
