# Fase 04 — App Shell e Navegação

## Objetivo

Shell completo do app autenticado: sidebar, topbar, breadcrumbs, command palette, drawer mobile, theme toggle e todas as rotas (com placeholders onde a feature ainda não existe).

## Specs-base para leitura

`00-project-rules.md`, `06-app-shell-navigation.md`, `03-design-system.md` (consulta), `14-data-fetching-state.md` (seção Zustand), `15-components-and-features.md`.

## Dependências (instalar nesta fase)

Zustand. (cmdk, motion, next-themes já instalados na Fase 2.)

## Arquivos esperados

- `apps/web/src/components/shell/*`: sidebar (colapsável + drawer mobile), topbar, breadcrumbs, user menu, org switcher, theme toggle.
- Stores Zustand: sidebar, command palette.
- Rotas de `06-app-shell-navigation.md` criadas com `loading.tsx`, `error.tsx`, `not-found.tsx` e conteúdo placeholder honesto ("em construção" — sem dados falsos).
- Command palette com navegação e ações básicas.

## Tarefas

1. Layout `(app)` com sidebar + topbar responsivos.
2. Colapso de sidebar persistido; drawer no mobile com foco gerenciado.
3. Breadcrumbs derivados de rota.
4. Command palette (`Ctrl/Cmd+K`): navegar + alternar tema.
5. Animações estruturais (Motion) dentro das durações da spec 03.
6. Estados ativos de navegação e skeletons por rota.

## Critérios de aceite

- [ ] Navegação completa por teclado; `aria-label` em botões só-ícone
- [ ] Shell responsivo (drawer mobile funcional)
- [ ] Tema alterna sem flash e persiste
- [ ] Nenhum dado do banco em Zustand
- [ ] Todas as rotas acessíveis com loading/error/not-found

## Testes necessários

Component tests: sidebar (colapso/aria), command palette (abre/filtra/navega — com router mockado).

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + verificação manual desktop/mobile/teclado nos dois temas.

## Fora do escopo

Conteúdo real das páginas (fases 5+); busca de empresas na palette (pós-MVP).

## Riscos

Shell mal estruturado degrada todas as páginas; acessibilidade do drawer/palette (focus trap) exige uso correto das primitivas Radix.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Aprovação antes da Fase 05

## Progresso atual

- Zustand instalado e usado apenas para estado de UI: sidebar colapsada/drawer mobile e command palette.
- Shell protegido implementado em `apps/web/src/components/shell`: sidebar desktop colapsável, drawer mobile, topbar, breadcrumbs, user menu, org ativa, theme toggle e command palette.
- Rotas da spec `06-app-shell-navigation.md` criadas com placeholders honestos para features futuras.
- `loading.tsx`, `error.tsx` e `not-found.tsx` adicionados no grupo `(app)`.
- Command palette abre com `Ctrl/Cmd+K`, navega entre páginas e alterna tema.
- Testes adicionados no app web para sidebar e command palette.
- Contexto do shell (`user`, `profile`, `organization`) carregado pela API Node separada `apps/api` em `GET /v1/app-context`, usando RPC `get_app_context()` e consumido no frontend com TanStack Query (`staleTime` de 30s), tirando chamadas remotas do Supabase do caminho de render RSC das rotas protegidas.
- API local dockerizada com `apps/api/Dockerfile` e `docker-compose.api.yml`; fluxo recomendado: `pnpm docker:api:up` + `pnpm dev`.
- Índice `organization_members_user_created_idx` criado e aplicado no Supabase para acelerar busca de organização ativa por usuário.
- Validação executada: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
