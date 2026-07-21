-- Fase 20 (P3): schema `ayhub` — gestão de clientes e sites, separado do
-- domínio de prospecção em `public`. specs/decisions/011.

create schema if not exists ayhub;

create type ayhub.cliente_status as enum ('ativo', 'inativo', 'inadimplente');
create type ayhub.cliente_origem as enum ('pipeline_aypros', 'manual');
create type ayhub.site_status as enum ('producao', 'manutencao', 'pausado');
create type ayhub.responsavel as enum ('eu', 'cliente');
create type ayhub.custo_tipo as enum ('dominio', 'hospedagem', 'storage', 'outro');
create type ayhub.periodicidade as enum ('mensal', 'anual', 'unico');
create type ayhub.content_block_tipo as enum ('text', 'image', 'list');
create type ayhub.content_block_status as enum ('rascunho', 'publicado');

create table ayhub.clientes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  nome text not null,
  contato text,
  valor_manutencao numeric,
  status ayhub.cliente_status not null default 'ativo',
  data_inicio timestamptz not null default now(),
  origem ayhub.cliente_origem not null,
  oportunidade_id_origem uuid references public.leads(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ayhub_clientes_org_idx on ayhub.clientes (organization_id);

create table ayhub.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cliente_id uuid not null references ayhub.clientes(id) on delete restrict,
  slug text not null unique,
  dominio text,
  dominio_responsavel ayhub.responsavel not null default 'eu',
  data_entrega timestamptz,
  status ayhub.site_status not null default 'producao',
  created_at timestamptz not null default now()
);

create index ayhub_sites_org_idx on ayhub.sites (organization_id);
create index ayhub_sites_cliente_idx on ayhub.sites (cliente_id);

create table ayhub.site_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references ayhub.sites(id) on delete cascade,
  key_hash text not null,
  criada_em timestamptz not null default now(),
  revogada_em timestamptz,
  ultima_utilizacao timestamptz
);

create index ayhub_site_keys_org_idx on ayhub.site_keys (organization_id);
create index ayhub_site_keys_site_idx on ayhub.site_keys (site_id);
create unique index ayhub_site_keys_hash_idx on ayhub.site_keys (key_hash);

create table ayhub.custos_site (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references ayhub.sites(id) on delete cascade,
  tipo ayhub.custo_tipo not null,
  valor numeric not null,
  periodicidade ayhub.periodicidade not null,
  proxima_renovacao date,
  responsavel_pagamento ayhub.responsavel not null default 'eu',
  created_at timestamptz not null default now()
);

create index ayhub_custos_site_org_idx on ayhub.custos_site (organization_id);
create index ayhub_custos_site_site_idx on ayhub.custos_site (site_id);

create table ayhub.content_blocks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  site_id uuid not null references ayhub.sites(id) on delete cascade,
  chave text not null,
  tipo ayhub.content_block_tipo not null default 'text',
  valor_rascunho jsonb,
  valor_publicado jsonb,
  status ayhub.content_block_status not null default 'rascunho',
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (site_id, chave)
);

create index ayhub_content_blocks_org_idx on ayhub.content_blocks (organization_id);
create index ayhub_content_blocks_site_idx on ayhub.content_blocks (site_id);

create table ayhub.pagamentos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cliente_id uuid not null references ayhub.clientes(id) on delete cascade,
  valor numeric not null,
  data date not null,
  created_at timestamptz not null default now()
);

create index ayhub_pagamentos_org_idx on ayhub.pagamentos (organization_id);
create index ayhub_pagamentos_cliente_idx on ayhub.pagamentos (cliente_id);

-- RLS: só membros owner/admin da organização acessam o AYhub (é um módulo
-- financeiro/de gestão, mais restrito que o acesso "todo membro" da pipeline).
alter table ayhub.clientes enable row level security;
alter table ayhub.sites enable row level security;
alter table ayhub.site_keys enable row level security;
alter table ayhub.custos_site enable row level security;
alter table ayhub.content_blocks enable row level security;
alter table ayhub.pagamentos enable row level security;

create policy "ayhub clientes owner admin all" on ayhub.clientes for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub sites owner admin all" on ayhub.sites for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub site_keys owner admin all" on ayhub.site_keys for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub custos_site owner admin all" on ayhub.custos_site for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub content_blocks owner admin all" on ayhub.content_blocks for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

create policy "ayhub pagamentos owner admin all" on ayhub.pagamentos for all to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.member_role[]));

-- PostgREST só atende schemas na lista "Exposed schemas" do projeto (Dashboard
-- > Settings > API). Adicione "ayhub" lá manualmente após aplicar esta
-- migration — os grants abaixo por si só não bastam. authenticated fica
-- restrito pelas policies acima; service_role ignora RLS e é usado só pela
-- API (nunca exposto a sites de cliente).
grant usage on schema ayhub to authenticated, service_role;
grant select, insert, update, delete on all tables in schema ayhub to authenticated, service_role;
alter default privileges in schema ayhub
  grant select, insert, update, delete on tables to authenticated, service_role;
