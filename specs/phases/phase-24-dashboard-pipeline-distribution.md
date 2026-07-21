# Fase 24 — Distribuição do pipeline no dashboard

> Spec escrita retroativamente: a fase já foi implementada e validada (lint/typecheck/test/build
> verdes, migration aplicada em produção) antes deste documento existir.

## Objetivo

Trocar o bloco "Hoje" do dashboard (lista de próximas ações vencidas/do dia, fase 13) por um
gráfico de pizza mostrando como os leads da organização estão distribuídos entre as etapas do
pipeline — visão de "quanto já foi contatado, quanto ainda não, ganhos e perdas" pedida pelo
usuário em vez de uma lista de tarefas.

## Specs-base para leitura

`00-project-rules.md`, `03-design-system.md` (tokens de cor reaproveitados nas fatias),
`07-dashboard.md` (atualizada nesta fase), `12-pipeline-crm.md` (estágios/rótulos reaproveitados
de `board.ts`), `14-data-fetching-state.md`.

## Dependências (instalar nesta fase)

`recharts` (`apps/web`) — nenhuma lib de gráfico existia no monorepo; escolhida por ser a mais
usada em projetos React/Tailwind, com `PieChart` simples o suficiente pro caso de uso e suporte a
React 19.

## Arquivos esperados

- `supabase/migrations/20260720200000_phase_24_dashboard_pipeline_distribution.sql`: RPC
  `get_dashboard_pipeline_distribution(org_id)` — retorna as 6 etapas sempre (mesmo com contagem
  zero), mesmo padrão `security invoker` + guard `is_org_member(org_id)` das outras agregações do
  dashboard (`20260716130000_phase_05_dashboard_aggregates.sql`).
- `apps/web/src/features/dashboard/schemas.ts`: `DashboardPipelineDistribution` +
  `parseDashboardPipelineDistribution` (reaproveita o `LeadStage` de `@aypros/types` e
  `LEAD_STAGES` de `@/features/pipeline/board` em vez de redefinir o enum). Remove
  `DashboardTodayLead`/`parseDashboardTodayLeads`.
- `apps/web/src/features/dashboard/queries.ts`: `getDashboardData` troca a query de
  `next_action_at` por uma chamada à nova RPC; `DashboardData.todayLeads` vira
  `pipelineDistribution`.
- `apps/web/src/features/dashboard/components/pipeline-distribution-block.tsx` (novo): gráfico de
  pizza (`recharts`) + legenda com contagem/percentual por etapa; reaproveita
  `leadStageLabels` de `@/features/pipeline/board` pros rótulos (mesmo texto do Kanban). Cores das
  fatias mapeadas pros tokens de `03-design-system.md` (`--success` só em "ganho",
  `--destructive` só em "perdido").
- `apps/web/src/features/dashboard/components/today-block.tsx`: removido.
- `apps/web/src/app/(app)/dashboard/page.tsx`: troca `TodayBlock` por `PipelineDistributionBlock`
  no mesmo lugar do layout.

## Tarefas

1. RPC `get_dashboard_pipeline_distribution` + aplicar migration.
2. Schema/parser + troca da query em `getDashboardData`.
3. `PipelineDistributionBlock` (gráfico + legenda + empty state).
4. Remover `TodayBlock` e a query de `next_action_at` associada; atualizar a página do dashboard.
5. Testes do parser e do componente (empty state + legenda com contagem/percentual).

## Critérios de aceite

- [x] Dashboard não mostra mais a lista "Hoje" de próximas ações.
- [x] Gráfico de pizza mostra as 6 etapas do pipeline com contagem e percentual na legenda,
      cores consistentes com o resto do produto (verde só em "ganho", vermelho só em "perdido").
- [x] Pipeline vazio (nenhum lead) mostra empty state com CTA pra `/businesses`, não gráfico
      quebrado ou zerado.
- [x] RPC nova segue o mesmo padrão de segurança das demais agregações do dashboard (member da
      organização vê só os dados da própria org).

## Testes necessários

P1: `parseDashboardPipelineDistribution` (mapeamento snake→camel, coerção de contagem bigint,
rejeição de estágio desconhecido/contagem negativa) — `schemas.test.ts`. P2:
`PipelineDistributionBlock` — empty state com CTA, legenda com rótulo/contagem/percentual —
`dashboard-blocks.test.tsx`.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (todos verdes) + `supabase db push`
aplicado no projeto remoto.

## Fora do escopo

Filtro de período no gráfico (ex.: distribuição só dos últimos 30 dias) — hoje é sempre o estado
atual do pipeline inteiro; drill-down (clicar numa fatia e ir pro Kanban filtrado naquele estágio)
— `18-roadmap.md` se algum dia justificar; qualquer outro gráfico no dashboard além deste.

## Riscos

`recharts` adiciona ~100kB à página `/dashboard` especificamente (code-split pelo Next.js, não
afeta outras rotas) — aceitável pelo ganho de leitura visual, mas vale reavaliar se o dashboard
ganhar mais gráficos e o peso começar a incomodar. RPC nova não tem teste automatizado dedicado no
banco (só validação manual via `db push` + checagem client-side) — mitigar escrevendo teste de
integração se a lógica de agregação crescer em complexidade.

## Checklist de conclusão

- [x] Critérios de aceite verificados.
- [x] Testes automatizados cobrindo P1/P2 (parser + componente).
- [ ] Fluxo validado pelo usuário no navegador.
- [ ] Aprovação explícita do usuário.
