# Fase 21 — AYhub (gestão de clientes e sites)

> Spec escrita retroativamente: a fase já foi implementada, validada (lint/typecheck/test/build
> verdes) e as migrations já foram aplicadas no banco de produção antes deste documento existir.
> Critérios e checklist abaixo refletem o que foi entregue, não um plano futuro.

## Objetivo

Dar ao freelancer um painel de gestão dos clientes/sites que ele constrói e mantém, alimentado
automaticamente pela pipeline do Aypros quando uma oportunidade vira "ganho", com estimador de
custo/proposta na própria pipeline e uma API própria para os sites de cliente buscarem conteúdo.

## Specs-base para leitura

`00-project-rules.md`, `04-database.md` (padrão de RLS/organização reaproveitado), `12-pipeline-crm.md`
(onde o estimador de custo e o gatilho "won" vivem), `13-ai-groq.md` (mecanismo de geração
reaproveitado pelo `cost_estimate`), `17-security.md` (autorização owner/admin, hash de SITE_KEY),
`19-backend-api.md` (contrato do `GET /v1/content`), e a spec nova `21-ayhub.md` (dedicada ao
módulo). Ver ADRs [012](../decisions/012-ayhub-app-structure.md),
[013](../decisions/013-ayhub-won-trigger.md), [014](../decisions/014-ayhub-portuguese-naming.md)
e [015](../decisions/015-ayhub-english-naming.md).

## Dependências (instalar nesta fase)

Nenhuma nova (reaproveita `@supabase/supabase-js`, `zod`, `react-hook-form`, `groq-sdk` já
presentes no monorepo).

## Arquivos esperados

- `packages/database/src/ayhub-schema.ts` + `drizzle.config.ts` (schema `ayhub` novo).
- `supabase/migrations/20260720130000_phase_20_lead_cost_estimate.sql`,
  `20260720140000_phase_20_ayhub_schema.sql`, `20260720150000_phase_20_ai_cost_estimate.sql`.
- `packages/types`, `packages/validation`: tipos e schemas Zod do AYhub e do `ai_kind`
  `cost_estimate`.
- `apps/api/src/ayhub.ts`, `ayhub-service.ts`, `content.ts` + registro em `app.ts`.
- `apps/api/src/leads.ts`: colunas de custo no PATCH + hook `findOrCreateAyhubClient`.
- `packages/integrations/src/ai/*`: kind `cost_estimate` (types, prompts, schemas).
- `apps/web/src/features/ayhub/*`: `api.ts`, `queries.ts`, componentes das 4 telas.
- `apps/web/src/features/pipeline/components/lead-detail-view.tsx`: card de estimativa + botão
  "Sugerir com IA".
- `apps/web/src/components/shell/navigation.ts`/`sidebar.tsx`/`command-palette.tsx`: entrada
  "AYhub" na seção "Gestão".
- `docs/ayhub-integracao.md`: guia de conexão de site de cliente.

## Tarefas

1. Estimador de custo e proposta no detalhe do lead (campos, cálculo server-side, persistência).
2. Schema Drizzle + migration do `ayhub` (6 tabelas, RLS owner/admin), incluindo SEO obrigatório
   e rascunho/publicado desde o início.
3. Hook `won` → criação/localização de cliente AYhub (`ayhub-service.ts`), integrado ao
   `PATCH /v1/leads/:id`.
4. Rotas `apps/api/src/ayhub.ts` (clientes, sites, SITE_KEY, custos, content blocks, publicar,
   pagamentos, dashboard).
5. Telas: lista de clientes + cadastro manual, detalhe de cliente, detalhe de site (custos,
   editor com abas Geral/SEO, publicar), dashboard.
6. Entrada "AYhub" no sidebar (seção "Gestão") e no command palette.
7. `GET /v1/content` (SITE_KEY hash), `docs/ayhub-integracao.md` com o client de consumo.
8. Sugestão de custo via Groq (`ai_kind` `cost_estimate`), reaproveitando o mecanismo de geração
   existente (retry, rate limit, log em `ai_generations`).

## Critérios de aceite

- [x] Oportunidade que vira "ganho" cria um cliente em `ayhub.clients` com `origin = pipeline` e
      `maintenance_value` = valor sugerido do estimador.
- [x] Reentrar em "ganho" no mesmo lead não duplica o cliente.
- [x] Lead sair de "ganho" depois de criar o cliente não apaga o cliente.
- [x] Cadastro manual de cliente funciona sem depender de nenhum lead.
- [x] Membro "member" da organização não acessa `/v1/ayhub/*` (403) nem as tabelas `ayhub.*` via
      RLS.
- [x] Site novo nasce com os 3 content blocks de SEO pré-criados.
- [x] Editar conteúdo no painel nunca muda o que a API pública retorna antes de publicar.
- [x] `GET /v1/content` com SITE_KEY revogada retorna 401.
- [x] Botão "Sugerir com IA" preenche e salva os 3 campos de custo a partir da resposta da Groq.

## Testes necessários

P0: `findOrCreateAyhubClient` (dedupe por origem e por contato); autorização owner/admin nas
rotas `ayhub.ts`; hash/validação de SITE_KEY em `content.ts`. P1: cálculo de custo mensal/valor
sugerido no `PATCH /v1/leads/:id`; publish (rascunho→publicado só nos blocos alterados). P2:
componentes de tela (lista de clientes, editor de conteúdo).

**Pendência conhecida**: só a suíte de regressão existente foi rodada (ficou verde); não foram
escritos testes automatizados novos para as rotas/hook/componentes do AYhub — ver "Riscos".

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (todos verdes na entrega) +
`supabase db push` aplicado no projeto remoto + verificação manual de `GET /v1/content` via curl
com SITE_KEY válida.

## Fora do escopo

Upload de imagem para blocos `image` (só URL); billing automático; preview visual completo do
site; edição de custos existentes (só criar/remover); pacote npm publicável do client de
conteúdo (fica como arquivo documentado, `18-roadmap.md` se algum dia justificar publicar).

## Riscos

Sem testes automatizados dedicados ao AYhub (rotas, hook, componentes) — regressões futuras nessa
área não são pegas pela suíte antes de chegar em produção; mitigar escrevendo-os antes da próxima
mudança relevante no módulo. O schema `ayhub` foi revertido para inglês antes de uso real
(ADR 015), então ADR 014 fica apenas como histórico da decisão substituída.

## Checklist de conclusão

- [x] Critérios de aceite verificados.
- [ ] Testes automatizados cobrindo P0/P1 do AYhub (pendente — ver "Riscos").
- [x] Migrations aplicadas em produção e schema `ayhub` exposto na Data API.
- [ ] Aprovação explícita do usuário.
