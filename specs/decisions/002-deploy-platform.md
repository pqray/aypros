# 002 - Plataforma de deploy

- **Data**: 2026-07-15
- **Status**: proposta, escopo revisado apos ADR 005

## Contexto

A arquitetura original do MVP processava pesquisas e auditorias dentro de invocacoes serverless do Next, sem filas. A ADR 005 separou o backend em `apps/api` (Node/Fastify), entao deploy passa a ter dois alvos: web e API.

## Decisao

Presumir **Vercel** como alvo inicial do `apps/web`. O deploy do `apps/api` deve ser decidido separadamente, com preferencia por plataforma que rode container Docker ou Node server persistente.

## Alternativas consideradas

- **Netlify** - suporte a Next.js inferior via adapter.
- **Railway/Render/Fly (Node server/container)** - candidatos naturais para `apps/api`; revisar antes de producao.
- **Self-host (Docker)** - viavel para API, mas adiciona gestao de infra.

## Consequencias

- `apps/web` pode continuar em Vercel pela integracao com Next.
- `apps/api` precisa de runtime Node/container, variaveis server-side e CORS configurado para a origem do web.
- Discovery/auditoria devem considerar limites da plataforma escolhida para a API, nao mais apenas limites dos Route Handlers do Next.
