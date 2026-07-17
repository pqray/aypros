# Fase 09 — Pipeline (CRM)

## Objetivo

Kanban de leads com drag and drop otimista, detalhe do lead, notas e timeline de atividades.

## Specs-base para leitura

`00-project-rules.md`, `12-pipeline-crm.md`, `14-data-fetching-state.md`, `03-design-system.md` (consulta: animações), `04-database.md` (consulta: `leads`, `notes`, `activities`).

## Dependências (instalar nesta fase)

Biblioteca de drag and drop (ADR pendente #3 — decidir no início; critérios: acessibilidade, manutenção ativa, peso).

## Arquivos esperados

- `features/pipeline/*`: Kanban (colunas por estágio, contagem, soma de valor), card do lead, DnD + reordenação (`position`), drawer/página de detalhe, notas (CRUD), timeline de atividades, edição de estágio/valor/próxima ação.
- Criação de lead a partir de: tabela de empresas (incl. lote — ativar stub da Fase 8), detalhe da empresa, dashboard.
- Rotas `/pipeline` (e detalhe) funcionais.

## Tarefas

1. Kanban com colunas fixas do enum e cards da spec 12.
2. DnD com optimistic update + rollback com toast; persistir estágio e `position`.
3. Alternativa acessível ao DnD. Histórico: na Fase 09 era "mover via menu do card"; a Fase 17 removeu esse menu e concentrou a edição nos controles do detalhe do lead.
4. Confirmação leve ao mover para `won`/`lost` (+ `lead_status`).
5. Notas com RHF+Zod; atividades automáticas (criação, mudança de estágio, nota).
6. Próxima ação com destaque de atraso.
7. Mobile: colunas com scroll horizontal.

## Critérios de aceite

- [ ] Drag persiste e sobrevive a reload; rollback visível em erro simulado
- [ ] Mover card possível 100% por teclado
- [ ] Um lead por empresa/org (re-adicionar leva ao existente)
- [ ] Toda mudança de estágio gera atividade com de/para
- [ ] Animações dentro das durações da spec 03; `prefers-reduced-motion` ok

## Testes necessários

Component: card do lead, coluna (render/empty); unit: action de mudança de estágio (autorização + atividade + position) com banco mockado.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + fluxo manual: criar lead → mover → nota → won.

## Fora do escopo

Estágios customizáveis, automações, múltiplos pipelines (roadmap); IA no lead (Fase 10).

## Riscos

DnD acessível é difícil — a alternativa por menu é obrigatória, não opcional; conflitos de `position` em uso concorrente (estratégia simples de reindexação).

## Checklist de conclusão

- [ ] ADR #3 registrado
- [ ] Critérios verificados
- [ ] Aprovação antes da Fase 10
