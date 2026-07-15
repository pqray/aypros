# 02 — Arquitetura

## Monorepo

pnpm workspaces + Turborepo. Estrutura:

```
/
├── apps/
│   └── web/                  # Next.js App Router (única app do MVP)
├── packages/
│   ├── ui/                   # componentes visuais genéricos (shadcn/ui + próprios)
│   ├── database/             # schema Drizzle, client, migrations helpers
│   ├── validation/           # schemas Zod compartilhados
│   ├── scoring/              # cálculo de score (puro, sem I/O)
│   ├── integrations/         # providers de descoberta, auditoria HTTP, Groq
│   ├── types/                # tipos compartilhados
│   ├── config/               # tsconfig, tailwind preset, constantes
│   └── eslint-config/        # config ESLint compartilhada
├── supabase/                 # migrations SQL, seed, config
├── specs/
├── docs/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

Regras de dependência entre packages: `ui` não importa `database`/`integrations`; `scoring` é puro (sem fetch, sem banco); `integrations` não importa `ui`. `apps/web` orquestra tudo.

## Fluxo de dados

```
UI (Server/Client Components)
  → Server Actions / Route Handlers (validação Zod, auth, autorização)
    → Serviços (apps/web/src/server/services ou packages/integrations)
      → Drizzle → Supabase Postgres
      → Providers externos (descoberta, HTTP audit, Groq)
```

## Divisão Server / Client

| Responsabilidade | Onde |
|---|---|
| Autenticação, proteção de rota, dados iniciais, perfil, organização, primeira renderização | Server Components |
| Pesquisas, progresso, listas paginadas, favoritos, pipeline, notas, atividades, IA, mutações | Client Components + TanStack Query |

Detalhes de fetching/estado em `14-data-fetching-state.md`.

## Server Actions vs Route Handlers

- **Server Actions**: mutações disparadas por formulários e interações (criar nota, mover lead, favoritar).
- **Route Handlers** (`app/api/*`): endpoints consumidos por TanStack Query (listas paginadas, polling de progresso de pesquisa/auditoria, exportação CSV) e webhooks futuros.
- Ambos: validar entrada com Zod, verificar sessão e membership da organização antes de qualquer operação.

## Providers desacoplados

`packages/integrations` define interfaces; implementações concretas são plugáveis:

- `DiscoveryProvider` — busca de empresas (ver `08-business-discovery.md`).
- `HttpAuditService` — análise HTTP (ver `09-website-http-audit.md`).
- `AiProvider` — Groq (ver `13-ai-groq.md`).

O restante do código depende apenas das interfaces. Provider mock implementa a mesma interface e existe somente em testes.

## Processos de longa duração (sem filas no MVP)

Sem Redis/BullMQ. Processos assíncronos (pesquisa, auditoria em lote) usam **estado no banco**:

`pending → processing → completed | partial | failed`

- A execução acontece dentro de Route Handlers/Server Actions, processando em lotes pequenos para caber nos **limites serverless** (timeout típico de 10–60s por invocação; máx. definido pelo plano de deploy).
- O cliente acompanha via polling (TanStack Query `refetchInterval`) enquanto o estado não for terminal.
- `partial`: parte dos itens processada com sucesso; erros registrados por item.
- Trabalho é idempotente e retomável: cada item registra seu próprio estado, permitindo continuar de onde parou em nova invocação.

## Estratégia futura para workers

Quando volume exigir (ver `18-roadmap.md`): extrair processamento para worker dedicado com fila (BullMQ + Redis), mantendo os mesmos estados no banco — a UI não muda. As interfaces de serviço já devem ser desenhadas para essa extração.
