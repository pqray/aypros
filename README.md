# Aypros

Plataforma SaaS B2B de prospecção comercial para profissionais que vendem criação e reformulação de sites. Responde: **"Quais empresas eu deveria abordar primeiro para vender um site?"**

## Documentação

A fonte oficial de verdade do projeto está em [`/specs`](specs/README.md) — leia o índice antes de qualquer implementação. Decisões arquiteturais em [`/specs/decisions`](specs/decisions/README.md).

## Stack

Monorepo pnpm + Turborepo · Next.js (App Router) · Fastify API · Docker · TypeScript strict · Tailwind CSS · shadcn/ui · Supabase (Postgres/Auth/Storage) · Drizzle · TanStack Query/Table · Groq · Vitest.

## Estrutura

```
apps/web              # aplicacao Next.js
apps/api              # backend Node/Fastify separado
packages/config       # tsconfigs base + constantes compartilhadas
packages/eslint-config
packages/types        # tipos compartilhados
packages/ui           # componentes visuais genéricos
packages/validation   # schemas Zod
packages/database     # schema Drizzle + client
packages/scoring      # score de oportunidade (puro)
packages/integrations # descoberta, auditoria HTTP, Groq
```

## Rodando localmente

1. Node >= 20 e pnpm 11 (`npm i -g pnpm`).
2. `cp .env.example .env.local` e preencha as chaves (Supabase, Groq, Google Places).
3. `pnpm install`
4. Suba a API separada: `pnpm docker:api:up`
5. Suba o web: `pnpm dev`

O web roda em `http://localhost:3000`; a API em `http://localhost:4000`.

## Comandos

| Comando | Ação |
|---|---|
| `pnpm dev` | dev server do web (API deve subir separada em Docker) |
| `pnpm dev:web` | dev server do Next.js |
| `pnpm dev:api` | fallback: dev server da API sem Docker |
| `pnpm dev:all` | fallback: todos os dev servers via Turbo |
| `pnpm docker:api:up` / `pnpm docker:api:down` | inicia/para a API em Docker |
| `pnpm docker:api:logs` | logs da API em Docker |
| `pnpm build` | build de todos os packages |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | qualidade |
| `pnpm format` | Prettier |
