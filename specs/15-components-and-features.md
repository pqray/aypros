# 15 — Componentes e Organização por Feature

## `packages/ui` — componentes genéricos

- Base shadcn/ui + Radix: Button, Input, Select, Dialog, Sheet/Drawer, Dropdown, Tabs, Tooltip, Badge, Card, Skeleton, Table primitives, Toast (Sonner), Command (cmdk), Avatar, Accordion, etc.
- Próprios genéricos: EmptyState, PageHeader, StatCard, ConfirmDialog, ScoreBadge (recebe nível via prop; cores por token).
- Regras: sem conhecimento de domínio/rotas/fetching; variantes via CVA; `cn()` exportado daqui; estilo 100% por tokens (`03-design-system.md`).

## `apps/web` — organização por feature

```
apps/web/src/
├── app/                    # rotas (grupos (auth) e (app)), layouts, loading/error
├── features/
│   ├── auth/
│   ├── onboarding/
│   ├── dashboard/
│   ├── discovery/
│   ├── businesses/
│   ├── favorites/
│   ├── pipeline/
│   ├── ai/
│   └── settings/
│       └── (cada feature: components/, hooks/, actions.ts, queries.ts, schemas locais se não compartilhados)
├── server/                 # serviços server-only (orquestração, auth helpers)
├── components/             # composições cross-feature do shell (sidebar, topbar)
└── lib/                    # utilitários da app
```

## Limites de responsabilidade

| Camada | Pode | Não pode |
|---|---|---|
| `packages/ui` | render, variantes, acessibilidade | fetch, banco, regras de negócio, rotas |
| `features/*/components` | compor UI + hooks da própria feature | chamar provider externo diretamente; importar de outra feature (subir para compartilhado) |
| `features/*/hooks` (queries.ts) | TanStack Query, keys da spec 14 | lógica de domínio pesada (fica em packages) |
| `features/*/actions.ts` | Server Actions: validar, autorizar, chamar serviços | conter regra de scoring/parsing (fica em packages) |
| `packages/*` (scoring, integrations) | lógica de domínio e integrações | importar React/UI |

**Proibido**: chamadas externas (fetch a APIs, banco) dentro de componentes visuais — dados entram por props ou hooks de query.

## Convenções

- Nomes de componentes PascalCase; hooks `useX`; arquivos kebab-case.
- Componentes de domínio recebem dados tipados de `packages/types`.
- Preferir composição a props booleanas em excesso; extrair para `packages/ui` apenas quando reutilizado por 2+ features.
