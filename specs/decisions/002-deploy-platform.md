# 002 — Plataforma de deploy: Vercel

- **Data**: 2026-07-15
- **Status**: proposta (aguardando confirmação do usuário)

## Contexto

A arquitetura do MVP (`specs/02-architecture.md`) processa pesquisas e auditorias dentro de invocações serverless, sem filas. Os limites de timeout da plataforma definem o tamanho dos lotes.

## Decisão

Presumir **Vercel** (plano Hobby/Pro) como alvo de deploy: melhor integração com Next.js App Router, Server Actions e ISR.

## Alternativas consideradas

- **Netlify** — suporte a Next.js inferior via adapter.
- **Railway/Render (Node server)** — remove limites de timeout, mas adiciona gestão de infra que o MVP não precisa.
- **Self-host (Docker)** — fora do perfil do projeto neste estágio.

## Consequências

- Route Handlers com timeout de 10s (Hobby) a 60s+ (Pro/fluid compute) — os lotes de descoberta/auditoria devem caber nisso; confirmar plano antes da Fase 06.
- Variáveis de ambiente gerenciadas no painel da Vercel; `DATABASE_URL` deve usar o transaction pooler (porta 6543), já configurado.
- Se o usuário optar por outra plataforma, revisar apenas tamanhos de lote — a arquitetura por estados no banco não muda.
