# Fase 12 — Refresh automático de dados

## Objetivo

Empresas ativas (favoritas ou em pipeline) com dados sempre frescos: re-busca periódica no Places (≤30 dias), re-auditoria HTTP (≤7 dias) e score recalculado — com caps de custo rígidos e refresh manual no detalhe da empresa.

## Specs-base para leitura

`00-project-rules.md`, `20-data-refresh.md`, `08-business-discovery.md` (normalização/dedup), `02-architecture.md` (processos assíncronos), `04-database.md` (consulta: `businesses`, `website_audits`), `17-security.md` (rate limiting, service role).

## Dependências (instalar nesta fase)

Nenhuma nova (scheduler in-process; se optar por `node-cron` em vez de `setInterval`, justificar no ADR).

## Arquivos esperados

- `packages/config`: `refreshConfig` (alvos de frescor, cap diário de Place Details, batch por tick).
- `packages/integrations/discovery`: suporte a **Place Details por `place_id`** com field mask mínima, reusando a normalização existente.
- `apps/api/src/refresh.ts`: seleção de candidatos por staleness, processamento serial idempotente, contagem de custo do dia, registro de `refreshed_at`.
- `apps/api` (boot): agendamento do tick horário, desligável por env (`REFRESH_ENABLED`), nunca rodando em testes.
- Rota `POST /v1/businesses/:businessId/refresh` (manual, autenticada, rate limit) + campo de frescor no `audit-summary`.
- Migration: `businesses.refreshed_at` (+ `provider_status` para place removido).
- Web: "Dados atualizados há X" + botão "Atualizar dados" no detalhe da empresa.

## Tarefas

1. ADR 008: mecanismo de agendamento do MVP (in-process vs fila externa) com gatilho de migração futura para BullMQ (`18-roadmap.md`).
2. Migration (`refreshed_at`, `provider_status`) aplicada com aprovação do usuário.
3. Place Details no provider de discovery (fetch + Zod + normalização compartilhada + mapeamento de erros, incl. `NOT_FOUND`).
4. Seleção de candidatos (SQL por staleness + empresa ativa) e loop serial com caps; nunca degradar dado existente.
5. Re-auditoria + recálculo de score reusando `auditBusiness` (sem duplicar fluxo).
6. Rota manual + UI de frescor no detalhe da empresa.
7. Observabilidade: log estruturado por tick (processados, falhas, custo gasto).

## Critérios de aceite

- [ ] Empresa favoritada/em pipeline com dado >30d é re-buscada no tick; empresa "morta" nunca gasta provider
- [ ] Cap diário de Place Details respeitado mesmo com backlog grande (verificável por log)
- [ ] Resposta vazia/erro do provider não apaga dado existente; `NOT_FOUND` marca `provider_status`
- [ ] Refresh (auto ou manual) gera novo score preservando histórico
- [ ] Scheduler desligado em testes e desligável por env; falha de um item não derruba o batch
- [ ] Refresh manual com rate limit e feedback de frescor na UI

## Testes necessários

P0: seleção de candidatos por staleness (unit, datas de tabela); regra "nunca degradar dado" (merge de resposta parcial/vazia). P1: mapeamento do Place Details (fixture → modelo, erros, `NOT_FOUND`); contagem/corte do cap diário.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + rodar um tick real com 1–2 empresas ativas velhas observando logs e o frescor na UI.

## Fora do escopo

Fila externa (BullMQ/Redis), monitoramento contínuo com alertas, refresh de empresas não-ativas — tudo em `18-roadmap.md`.

## Riscos

Custo do Place Details — mitigar com cap conservador default e field mask mínima; loop infinito de refresh em empresa com erro permanente — mitigar marcando `provider_status` e excluindo da seleção.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Custo real observado e reportado ao usuário (chamadas/dia)
- [ ] Aprovação explícita antes da Fase 13
