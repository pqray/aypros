# Fase 05 — Dashboard

## Objetivo

Dashboard com métricas reais da organização, busca rápida, oportunidades em destaque, pesquisas recentes e atividades — com empty states completos (nesta altura o app quase não tem dados; os blocos devem ser honestos).

## Specs-base para leitura

`00-project-rules.md`, `07-dashboard.md`, `03-design-system.md` (consulta), `06-app-shell-navigation.md` (consulta), `14-data-fetching-state.md`, `15-components-and-features.md`.

## Dependências (instalar nesta fase)

Nenhuma nova (TanStack Query já configurado na Fase 3).

## Arquivos esperados

- `features/dashboard/*`: componentes dos blocos, queries agregadas server-side, empty states.
- Rota `/dashboard` substituindo o placeholder.

## Tarefas

1. Queries agregadas por organização (Server Component): contagens de pesquisas, empresas, sem site, leads.
2. Cards de métricas (StatCard) com zeros honestos.
3. Busca rápida → redireciona a `/discovery` com params na URL.
4. Blocos de oportunidades, pesquisas recentes e atividades — todos com empty state próprio + CTA.
5. Hero de boas-vindas para organização sem dados.

## Critérios de aceite

- [ ] Nenhum número falso; sem dados → empty states com CTA
- [ ] Grid responsivo 4→2→1
- [ ] Dados escopados pela organização ativa
- [ ] Cores de oportunidade via tokens; verde só em alto/success

## Testes necessários

Component tests dos blocos com dados vazios e populados (fixtures); teste da query de agregação se extraída como função.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + verificação manual com org vazia.

## Fora do escopo

Discovery real (Fase 6) — a busca rápida pode apontar para a rota ainda placeholder; score real (Fase 7).

## Riscos

Blocos dependem de dados de fases futuras — implementar contra o schema (já existente desde a Fase 3) e validar de novo ao final (Fase 11).

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Aprovação antes da Fase 06
