# Fase 23 — Progresso do lead, cards colapsáveis e performance do PATCH de leads

> Spec escrita retroativamente: a fase já foi implementada e validada (lint/typecheck/test/build
> verdes) antes deste documento existir. Critérios e checklist abaixo refletem o que foi entregue.

## Objetivo

Simplificar a navegação de estágio no detalhe do lead (o stepper de 6 etapas clicáveis não
comunicava nada de diferente ao clicar), deixar os cards de referência do detalhe do lead e da
página da empresa colapsáveis com preferência lembrada, e reduzir a latência do `PATCH
/v1/leads/:id` percebida ao mudar de estágio.

## Specs-base para leitura

`00-project-rules.md`, `03-design-system.md`, `12-pipeline-crm.md` (atualizada nesta fase),
`11-businesses-and-favorites.md` (atualizada nesta fase), `14-data-fetching-state.md`,
`19-backend-api.md` (atualizada nesta fase). Depende da fase 22 (painel por estágio) já estar
implementada.

## Dependências (instalar nesta fase)

Nenhuma nova.

## Arquivos esperados

- `apps/web/src/features/pipeline/board.ts`: `nextForwardStage()` — progressão linear novo →
  contactado → em conversa → proposta enviada → ganho (`lost` fica fora, é alcançável de
  qualquer estágio não-terminal, não só do último).
- `apps/web/src/features/pipeline/components/lead-detail-view.tsx`: `StageStepper` (grid de 6
  botões) substituído por `StageProgress` (badge do estágio atual + botão "Avançar para [próxima
  etapa]" + botão "Marcar como perdido", ambos somem em estágio terminal). Cards de "Estimativa de
  custo e proposta" e "Potencial" viram `CollapsibleCard`; "Dados comerciais" e "Registrar
  contato" continuam sempre abertos (ação direta, não referência).
- `apps/web/src/components/collapsible-card.tsx` (novo): `CollapsibleCard` — wrapper de
  `Card`/`CardHeader` com toggle (chevron + título + descrição opcional + ações de cabeçalho) e
  `CardContent` fornecido por quem chama.
- `apps/web/src/lib/use-persisted-open.ts` (novo): `usePersistedOpen(storageKey, defaultOpen)` —
  estado de aberto/fechado persistido em `localStorage` sob o prefixo `aypros:card-open:`.
- `apps/web/src/features/businesses/components/business-detail-view.tsx`,
  `business-diagnostic.tsx`, `business-ai-briefing-card.tsx`: cards "Presença digital", "Resumo
  da oportunidade", "Potencial da oportunidade", "Maturidade digital" e "Briefing IA" viram
  `CollapsibleCard`.
- `apps/api/src/leads.ts`: `PATCH /v1/leads/:id` — reindexação completa da coluna (consulta de
  "irmãos" + updates em paralelo) só roda quando `position` vem explícito (drag no Kanban); troca
  de estágio sem `position` (botão "Avançar"/"Marcar como perdido") faz só uma contagem
  (`head: true`) pra descobrir a posição no fim da coluna de destino. Log de atividade
  (`lead_stage_changed`, `lead_assigned`) e o hook de criação do cliente AYhub em "Ganho" viram
  fire-and-forget (`void ...().catch(...)`) em vez de bloquear a resposta. Log de `lead_assigned`
  busca só o perfil do novo responsável (uma linha), não a lista inteira de membros da org.

## Tarefas

1. `nextForwardStage()` em `board.ts` + `StageProgress` no lugar do `StageStepper`.
2. `CollapsibleCard` + `usePersistedOpen` em `apps/web` (não em `@aypros/ui` — mistura
   apresentação com persistência local, mantido no app).
3. Aplicar `CollapsibleCard` nos cards de referência do detalhe do lead e da página da empresa
   (ação direta continua sempre aberta, sem toggle).
4. Otimizar `PATCH /v1/leads/:id`: reindex só no drag, contagem leve na troca de estágio simples,
   logs de atividade e hook do AYhub non-blocking, log de `lead_assigned` sem buscar todos os
   membros.

## Critérios de aceite

- [x] Detalhe do lead mostra só o estágio atual + botão de avançar (quando não terminal) + botão
      de marcar como perdido; sem grid de 6 etapas clicáveis.
- [x] Clicar em "Avançar" muda de estágio linearmente; para "Ganho" e "Perdido" continua passando
      pelos diálogos de confirmação já existentes (`ConfirmDialog`/`LostReasonDialog`).
- [x] Cards colapsáveis nascem abertos por padrão; fechar um persiste entre navegações (mesmo tipo
      de card, qualquer lead/empresa) via `localStorage`.
- [x] Cards de ação direta (Dados comerciais, Registrar contato) nunca ficam colapsáveis.
- [x] `PATCH /v1/leads/:id` sem `position` explícito não consulta nem reindexa os "irmãos" da
      coluna de destino — só conta.
- [x] Log de atividade e criação do cliente AYhub não atrasam a resposta do `PATCH` (erros
      continuam logados, nunca derrubam a resposta).

## Testes necessários

**Pendência conhecida**: nenhum teste automatizado dedicado foi escrito nesta fase — só a suíte de
regressão existente rodou (ficou verde). P0 que ficaria pendente pra próxima mudança relevante
nessa área: `nextForwardStage()` (progressão e caso terminal), `usePersistedOpen` (lê/grava
`localStorage`, `defaultOpen` quando não há valor salvo), `StageProgress` (botão de avançar some
em estágio terminal, "marcar como perdido" abre o diálogo certo). P1: `PATCH /v1/leads/:id` grava
`position` correto sem `position` explícito (fim da coluna) vs. com `position` explícito
(reindex).

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` (todos verdes na entrega) + verificação
manual: colapsar/expandir um card, navegar pra outro lead/empresa e conferir que a preferência se
manteve; avançar um lead pelos 5 estágios não-terminais e marcar outro como perdido.

## Fora do escopo

Persistir a preferência de card no perfil do usuário via API (fica local por navegador/dispositivo
— `18-roadmap.md` se algum dia justificar sincronizar); voltar estágio pelo `StageProgress` (só
avança; correção de estágio errado continua possível editando o campo "Status comercial" ou via
suporte); tornar `AiGenerationsCard`/`ContactCopilotCard`/`FollowUpPanel`/`WonPanel`/
`LostReasonPanel` colapsáveis (já isolados em aba própria, colapsar não ajudaria).

## Riscos

Sem teste automatizado dedicado (ver "Testes necessários") — regressão futura em
`nextForwardStage`, `usePersistedOpen` ou na lógica de reindex condicional do `PATCH` não é pega
pela suíte antes de chegar em produção. Preferência de card colapsado é por tipo de card, não por
registro — se um usuário achar isso contraintuitivo (esperar que só aquele lead específico fique
colapsado), é ajuste de UX pra decisão futura, não bug.

## Checklist de conclusão

- [x] Critérios de aceite verificados.
- [ ] Testes automatizados cobrindo P0/P1 (pendente — ver "Riscos").
- [ ] Fluxo validado pelo usuário no navegador (colapsar/expandir, avançar estágio, drag no
      Kanban).
- [ ] Aprovação explícita do usuário.
