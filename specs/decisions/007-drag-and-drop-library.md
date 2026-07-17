# 007 — Biblioteca de drag and drop: @dnd-kit

- **Data**: 2026-07-16
- **Status**: aceita

## Contexto

A Fase 09 (`12-pipeline-crm.md`) exige um Kanban de leads com drag and drop otimista entre colunas e reordenação (`position`). Na época, a alternativa acessível ao DnD era "mover via menu do card". A Fase 17 removeu esse menu do card e moveu o caminho alternativo para controles diretos no detalhe do lead.

## Decisão

Usar **@dnd-kit** (`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`) para o Kanban.

Motivos:
- **Acessibilidade nativa**: teclado (`KeyboardSensor`) e anúncios a leitor de tela funcionam por padrão, sem código extra — reduz o risco do critério que a própria spec marca como obrigatório. A alternativa por menu continua sendo implementada (ela cobre o fluxo primário sem exigir foco no card), mas o DnD em si já nasce navegável por teclado.
- **Manutenção ativa**: releases recentes (fevereiro/2026), ~2,8M downloads semanais, é o padrão de facto da comunidade React para DnD desde a descontinuação do `react-beautiful-dnd`.
- **Peso**: ~6KB (core) — aceitável; o Kanban vive numa rota própria (`/pipeline`), não afeta o bundle inicial do app.
- **Modularidade**: `@dnd-kit/sortable` cobre exatamente o caso "reordenar dentro de uma lista + mover entre listas" que o Kanban precisa, com hook `useSortable` direto por card.

Usamos os pacotes estáveis `@dnd-kit/core`/`sortable` (não o `@dnd-kit/react`, ainda em desenvolvimento e sem API estabilizada).

## Alternativas consideradas

- **@atlaskit/pragmatic-drag-and-drop** (Atlassian) — menor (<4KB) e usado em produção em escala (Trello/Jira), mas acessibilidade é "compor você mesmo": exigiria implementar navegação por teclado e anúncios do zero, indo contra o critério de acessibilidade priorizado pela spec.
- **react-dnd** — API mais antiga/verbosa (backend HTML5), suporte a React 19 ainda em aberto, acessibilidade fraca por padrão.
- **react-beautiful-dnd** — descontinuado pela Atlassian; não é opção viável para código novo.

## Consequências

- Implementação do Kanban usa `DndContext` + `SortableContext` + `useSortable`; estado otimista via TanStack Query (`onMutate`/rollback) ao soltar um card.
- A alternativa por menu foi a decisão da Fase 09. A Fase 17 substituiu o menu "Mover para..." do card por controles diretos no detalhe do lead; o requisito de acessibilidade permanece, mas o caminho alternativo não fica mais no card do Kanban.
- Trocar de biblioteca depois é isolado ao `features/pipeline` (o resto do app não depende de DnD).
