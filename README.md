# Aypros

Plataforma SaaS B2B de prospecção comercial para profissionais que vendem criação e reformulação de sites. Responde: **"Quais empresas eu deveria abordar primeiro para vender um site?"**

## Documentação

A fonte oficial de verdade do projeto está em [`/specs`](specs/README.md) — leia o índice antes de qualquer implementação. Decisões arquiteturais em [`/specs/decisions`](specs/decisions/README.md).

## Stack

Monorepo pnpm + Turborepo · Next.js (App Router) · TypeScript strict · Tailwind CSS · shadcn/ui · Supabase (Postgres/Auth/Storage) · Drizzle · TanStack Query/Table · Groq · Vitest.

## Estrutura

```
apps/web              # aplicação Next.js
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
4. `pnpm dev`

## Comandos

| Comando | Ação |
|---|---|
| `pnpm dev` | dev server |
| `pnpm build` | build de todos os packages |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` | qualidade |
| `pnpm format` | Prettier |
