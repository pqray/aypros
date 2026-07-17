# Fase 16 — Responsável pelo lead

## Objetivo

Organizações com mais de um membro conseguem dividir a carteira: cada lead pode ter um responsável, com filtro "meus leads" e indicação visual no Kanban. Fase pequena — só faz sentido implementar quando houver segundo usuário real.

## Specs-base para leitura

`00-project-rules.md`, `12-pipeline-crm.md`, `05-auth-onboarding.md` (membros/roles, convite por e-mail — ADR 004), `04-database.md` (consulta: `leads`, `organization_members`), `14-data-fetching-state.md`.

## Dependências (instalar nesta fase)

Nenhuma nova.

## Arquivos esperados

- Migration: `leads.assigned_to uuid null references profiles` + índice; atividade `lead_assigned` no enum `activity_type`.
- `apps/api/src/leads.ts`: `assigned_to` no PATCH (validando que é membro da org) e no `GET /v1/pipeline`/detalhe; atividade registrada na troca.
- Web `features/pipeline`: seletor de responsável no detalhe (lista membros da org), avatar/iniciais no card do Kanban, filtro "Todos | Meus" na visão do pipeline (URL como fonte de verdade).
- Timeline exibindo atribuições ("Lead atribuído a X").

## Tarefas

1. Migration (coluna + enum) com aprovação do usuário.
2. Endpoint de membros da org (ou reuso do app-context) para popular o seletor.
3. PATCH com validação de membership do atribuído + atividade.
4. UI: seletor no detalhe, avatar no card, filtro na toolbar do pipeline.
5. Regra de novos leads: criador vira responsável default (comportamento atual implícito preservado).

## Critérios de aceite

- [ ] Atribuir a alguém de fora da org é rejeitado pela API
- [ ] Filtro "Meus" persiste na URL e sobrevive a refresh
- [ ] Troca de responsável aparece na timeline
- [ ] Lead sem responsável continua válido (coluna nullable) e aparece em "Todos"

## Testes necessários

P1: validação de membership no PATCH (unit); filtro meus/todos na montagem da query. P2: card do Kanban com avatar; seletor no detalhe.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + fluxo manual com 2 usuários na mesma org (convite via ADR 004).

## Fora do escopo

Permissões por lead (qualquer membro segue vendo/editando tudo), notificação ao atribuído, múltiplos pipelines — `18-roadmap.md` (CRM avançado).

## Riscos

Fase entrar cedo demais e virar código morto — gatilho de início: existir organização real com 2+ membros.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Fluxo com 2 usuários executado e reportado
- [ ] Aprovação explícita antes da próxima fase
