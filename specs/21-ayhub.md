# 21 — AYhub (gestão de clientes e sites)

Módulo de pós-venda: gestão dos clientes/sites que o freelancer constrói e mantém, complementar à
prospecção do Aypros. Vive em `/ayhub`, schema Postgres próprio (`ayhub`), separado de `public`.
Acesso restrito a membros **owner/admin** da organização (mais restrito que a pipeline, que libera
qualquer membro) — é um módulo financeiro/de gestão.

## Schema (`ayhub`, `04-database.md` cobre só `public`)

Tabelas em inglês, seguindo `00-project-rules.md` §3: `clients`, `sites`, `site_keys`,
`site_costs`, `content_blocks`, `payments`. Todas carregam `organization_id` direto (mesmo padrão
de denormalização usado em `notes`/`activities` no schema `public`), com RLS via
`has_org_role(organization_id, ['owner','admin'])`.

O schema chegou a ser criado em português ([ADR 014](decisions/014-ayhub-portuguese-naming.md)) e
foi revertido para inglês antes de qualquer uso real ([ADR 015](decisions/015-ayhub-english-naming.md))
— histórico só para quem for ler as migrations antigas.

`clients.origin` distingue `pipeline` (criado automaticamente) de `manual` (cadastrado direto no
AYhub, para clientes fora do fluxo de prospecção). `origin_lead_id` aponta pro lead de origem
quando `origin = pipeline` (nullable, `on delete set null`).

`sites.status` inclui `development`, `live`, `maintenance` e `paused`. Todo site novo nasce como
`development` ("Em desenvolvimento") e só deve ir para `live` quando já estiver publicado/entregue.

PostgREST só serve schemas na lista "Exposed schemas" do projeto Supabase (Dashboard → Settings →
API) — `ayhub` precisa estar nessa lista, é configuração de projeto, não migration.

## Estimador de custo e proposta (na tela de oportunidade, `12-pipeline-crm.md`)

Card no detalhe do lead (`/pipeline/[leadId]`), não no AYhub: custo de domínio (R$/ano, padrão 40),
custo de hospedagem (R$/mês, padrão pago 35; editável manualmente), margem alvo (%). Persistidos como colunas simples em
`public.leads` (`domain_cost_annual`, `hosting_cost_monthly`, `margin_target_percent`,
`estimated_monthly_cost`, `suggested_maintenance_value`).

Cálculo feito **no backend** (`PATCH /v1/leads/:id`), nunca no cliente: `custo mensal = domínio/12
+ hospedagem`; `valor sugerido = custo mensal / (1 - margem/100)`. Recalculado sempre que qualquer
um dos três inputs muda, usando o valor já persistido para os campos não enviados.

Botão "Sugerir com IA" chama Groq (`13-ai-groq.md`) com um 4º `ai_kind`, `cost_estimate`: mesmo
`AiInput` estruturado (segmento, achados de auditoria, score) já usado pelos outros tipos de
geração, mesma retentativa em JSON inválido, mesmo rate limit diário por organização. Sugestão
preenche os 3 campos e salva; nunca assume hospedagem grátis e nunca substitui edição manual do
usuário depois.

## Trigger pipeline → cliente

Quando `leads.status` entra em `won` (vindo de outro status) — dentro do mesmo
`PATCH /v1/leads/:id`, depois do update da lead ser persistido — chama `findOrCreateAyhubClient`
em `try/catch`: falha aqui nunca derruba a resposta do pipeline (complementar, não obrigatório,
[ADR 013](decisions/013-ayhub-won-trigger.md)). Dedupe, nessa ordem:

1. Já existe `ayhub.clients` com `origin_lead_id` = esse lead → reusa (evita duplicar se o lead
   sai de "won" e volta).
2. Já existe cliente com `contact` = telefone da empresa → reusa e faz backfill de
   `origin_lead_id` se estava nulo.
3. Senão, cria novo cliente com `origin = pipeline`, `maintenance_value` =
   `suggested_maintenance_value` do lead.

Lead voltar de "won" para outro status **não** apaga o cliente já criado — entrada no AYhub é
permanente uma vez criada.

## Telas (`/ayhub`)

| Rota | Conteúdo |
|---|---|
| `/ayhub` | Dashboard: sites ativos, MRR bruto/líquido, alertas de renovação, margem por cliente |
| `/ayhub/clients` | Lista de clientes (nome, status, valor de manutenção, origem, nº de sites) + cadastro manual |
| `/ayhub/[clientId]` | Dados do cliente, link pra oportunidade de origem (se houver), lista de sites, registro de pagamento |
| `/ayhub/sites/[siteId]` | SITE_KEY (gerar/revogar), custos com alerta de renovação (<30 dias), editor de conteúdo (abas Geral/SEO), publicar |
| `/ayhub/docs` | Documentação in-app: conceitos do módulo (clientes, sites, custos, conteúdo, dashboard) + guia técnico de conexão de site |

Entrada "AYhub" no sidebar numa seção "Gestão" própria, separada da prospecção
(`06-app-shell-navigation.md`).

## Conteúdo: SEO e rascunho/publicado

Todo site ganha 3 `content_blocks` obrigatórios na criação (`seo.title`, `seo.description`,
`seo.og_image`), numa aba própria "SEO" no editor. Campos adicionais (`key` livre, ex.:
`hero.title`) são criados sob demanda pelo usuário na aba "Geral".

Todo bloco tem `draft_value` e `published_value` separados: editar no painel grava só rascunho.
"Publicar alterações" (por site, não por campo) copia rascunho → publicado nos blocos que
mudaram, marca `status = published` e `published_at = now()`. Indicador "X alterações não
publicadas" no site quando há diferença. A API pública (abaixo) sempre retorna `published_value`.

## API pública para sites de cliente

`GET /v1/content` em `apps/api` (`19-backend-api.md`), autenticado por header
`Authorization: Bearer <SITE_KEY>` — nunca por sessão/cookie. Valida hash SHA-256 da chave contra
`ayhub.site_keys` (não revogada), atualiza `last_used_at`, retorna `{ blocks: { key:
published_value } }`. Cache `private, max-age=10`. Uma SITE_KEY ativa por site: gerar uma nova
revoga a anterior automaticamente.

Client de consumo (`getContent`, `getSeoMetadata`) é um arquivo documentado
(`docs/ayhub-integracao.md` + espelhado em `/ayhub/docs` no painel), não um pacote workspace —
sites de cliente são repositórios separados fora deste monorepo, então um pacote `@aypros/*` não
seria instalável neles.

## Fora do escopo (ver `18-roadmap.md`)

Upload de imagem além de campo de texto/URL para blocos tipo `image`; billing automático
(`payments.amount` é registro manual); preview visual completo do site (só comparação de campos
rascunho×publicado no painel); telas de edição de custos (`PATCH`) — hoje só criar/remover.
