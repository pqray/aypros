# Fase 02 — Design System

## Objetivo

Implementar tokens, temas light/dark e a base de `packages/ui` (componentes genéricos estilizados), sem nenhuma feature de produto.

## Specs-base para leitura

`00-project-rules.md`, `03-design-system.md`, `15-components-and-features.md`.

## Dependências (instalar nesta fase)

shadcn/ui (CLI + componentes base), Radix UI, react-icons, next-themes, sonner, cmdk, class-variance-authority, clsx, tailwind-merge, tailwindcss-animate, motion, Testing Library (para testes de componente).

## Arquivos esperados

- `packages/config`: preset Tailwind com mapeamento de CSS variables → classes semânticas.
- `apps/web/src/app/globals.css`: CSS variables dos dois temas (único lugar com hex).
- `packages/ui`: `cn()`, Button, Input, Label, Select, Dialog, Sheet, DropdownMenu, Tabs, Tooltip, Badge, Card, Skeleton, Avatar, Accordion, EmptyState, PageHeader, StatCard, ScoreBadge, ConfirmDialog, toaster (Sonner), Command (cmdk).
- `apps/web/app/(dev)/design`: página interna de showcase dos componentes nos dois temas (dev only).

## Tarefas

1. Definir CSS variables (paleta Soft Lavender + semânticas + níveis de oportunidade) para light e dark.
2. Configurar next-themes com toggle funcional e sem flash.
3. Gerar/ajustar componentes shadcn para usar somente tokens; variantes via CVA.
4. Criar componentes próprios (EmptyState, StatCard, ScoreBadge...).
5. Escolher e configurar fonte (ADR pendente #2) via `next/font`.
6. Página de showcase para validação visual.

## Critérios de aceite

- [ ] Nenhum hex fora dos tokens centrais; nenhum `style={{}}`; nenhuma classe `bg-[#...]`
- [ ] Light e dark completos e com contraste AA nos pares principais
- [ ] Verde presente apenas em success/oportunidade alta
- [ ] Foco visível em todos os interativos; `prefers-reduced-motion` respeitado
- [ ] Ícones: só `pi` funcional (+`si` marcas no showcase)

## Testes necessários

Component tests: ScoreBadge (níveis→classes), Button (variantes), EmptyState.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + verificação visual do showcase nos dois temas.

## Fora do escopo

Qualquer página de produto, auth, banco. Command palette funcional (só o componente base aqui; integração na Fase 4).

## Riscos

Tokens mal projetados obrigam retrabalho em todas as fases de UI — validar showcase com o usuário antes de concluir.

## Checklist de conclusão

- [ ] Critérios de aceite verificados
- [ ] ADR da fonte criado
- [ ] Showcase aprovado visualmente pelo usuário
- [ ] Aprovação antes da Fase 03
