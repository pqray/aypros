# Fase 08 — Empresas, Favoritos e CSV

## Objetivo

Tabela rica de empresas (TanStack Table) com filtros, filtros salvos, ações em lote, página de detalhe completa, favoritos e exportação CSV.

## Specs-base para leitura

`00-project-rules.md`, `11-businesses-and-favorites.md`, `14-data-fetching-state.md`, `03-design-system.md` (consulta), `15-components-and-features.md` (consulta), `17-security.md` (CSV injection).

## Dependências (instalar nesta fase)

TanStack Table.

## Arquivos esperados

- `features/businesses/*`: tabela (colunas da spec 11), filtros na URL, filtros salvos, seleção + ações em lote, página `/businesses/[id]` (score, presença digital, histórico de auditorias, reanalisar).
- `features/favorites/*`: listagem + toggle otimista.
- Route Handlers: listagem paginada/ordenada/filtrada server-side; exportação CSV com escaping.
- Rotas `/businesses`, `/businesses/[id]`, `/favorites` e `/searches` (reabrir resultados) funcionais.

## Tarefas

1. Endpoint de listagem com filtros/ordenação/paginação server-side.
2. Tabela com estado na URL; empty states distintos (sem pesquisa vs filtro sem resultado).
3. Filtros salvos (CRUD em `saved_filters`).
4. Seleção (Zustand) + lote: favoritar, auditar, adicionar ao pipeline*, exportar. (*botão presente; criação real de lead entra na Fase 9 — se necessário, stub desabilitado com tooltip.)
5. Página de detalhe com evidências da auditoria e histórico.
6. Favoritos com optimistic update + rollback.
7. CSV server-side com proteção contra formula injection + atividade `export_created`.

## Critérios de aceite

- [ ] Filtros/ordenação/página sobrevivem a reload e são compartilháveis por URL
- [ ] Favoritar responde instantaneamente com rollback em erro
- [ ] CSV abre corretamente e escapa células perigosas
- [ ] Tabela responsiva (scroll horizontal ou cards no mobile)
- [ ] Ações em massa operam sobre a seleção correta entre páginas

## Testes necessários

P1: geração de CSV (escaping/injection). Component: tabela (render/empty), ScoreBadge em contexto, toggle de favorito (otimista com query client de teste).

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + fluxo manual completo pós-pesquisa real.

## Fora do escopo

Pipeline/Kanban (Fase 9), IA (Fase 10).

## Riscos

Performance da listagem com muitos resultados (índices da spec 04; paginação sempre server-side); complexidade de estado tabela+URL — seguir spec 14 à risca.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Aprovação antes da Fase 09
