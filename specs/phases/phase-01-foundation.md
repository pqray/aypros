# Fase 01 — Foundation

## Objetivo

Criar o monorepo funcional com tooling compartilhado e packages vazios (esqueleto), sem nenhuma feature.

## Specs-base para leitura

`00-project-rules.md`, `02-architecture.md`, `15-components-and-features.md` (apenas seção de estrutura).

## Dependências (instalar nesta fase)

pnpm workspaces, Turborepo, Next.js, React, TypeScript, ESLint, Prettier, Tailwind CSS (config mínima), Vitest. Nada de Supabase/Drizzle/TanStack/Groq ainda.

## Arquivos esperados

- Raiz: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.gitignore`, `.env.example` (vazio comentado), `README.md` básico.
- `apps/web`: Next.js App Router + TS strict + Tailwind, página placeholder única.
- `packages/`: `config` (tsconfig base, preset tailwind vazio), `eslint-config`, `types`, `ui`, `validation`, `database`, `scoring`, `integrations` — cada um com `package.json`, `tsconfig` e index vazio.
- Git inicializado com commit inicial.

## Tarefas

1. Inicializar git e pnpm workspace.
2. Configurar Turborepo (`build`, `dev`, `lint`, `typecheck`, `test`).
3. Criar `apps/web` (Next + TS strict + ESLint + Tailwind).
4. Criar packages esqueleto com dependências internas corretas (`02-architecture.md`).
5. Configurar Prettier + ESLint compartilhados; Vitest raiz configurado.
6. Confirmar plataforma de deploy presumida (ADR pendente #5).

## Critérios de aceite

- [ ] `pnpm install` limpo
- [ ] `pnpm dev` sobe a web app
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm build` passam
- [ ] `pnpm test` roda (ainda sem testes reais, sem falhar)
- [ ] TS strict em todos os packages; imports entre packages funcionando

## Testes necessários

Nenhum de domínio; apenas pipeline de teste funcionando (1 teste trivial em `scoring` para validar o setup é aceitável e será substituído).

## Comandos de validação

`pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm dev`.

## Fora do escopo

Qualquer UI real, Supabase, auth, tokens de design (Fase 2).

## Riscos

Versões incompatíveis (Next/Tailwind/Turbo) — fixar versões estáveis; monorepo mal configurado contamina todas as fases seguintes.

## Checklist de conclusão

- [ ] Critérios de aceite verificados
- [ ] ADR de deploy criado se decidido
- [ ] Arquivos alterados reportados
- [ ] Aprovação do usuário antes da Fase 02
