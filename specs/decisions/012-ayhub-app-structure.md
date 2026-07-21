# 012 — Estrutura do AYhub: rota em apps/web vs app novo

- **Data**: 2026-07-20
- **Status**: aceita

## Contexto

O AYhub (gestão de clientes/sites pós-venda) precisava de uma decisão inicial: viver como rota
nova dentro do `apps/web` existente, ou como um app Next.js separado (`apps/ayhub`) no monorepo.

## Decisão

Rota `/ayhub` dentro do `apps/web` existente, reaproveitando shell, sidebar, autenticação e
`packages/ui`/`packages/config` já montados.

## Alternativas consideradas

- App novo `apps/ayhub` — isolaria o domínio de gestão do domínio de prospecção, mas duplicaria
  shell/auth/layout e exigiria navegação cross-app para a entrada única no sidebar que o produto
  pede (AYhub e Aypros são o mesmo painel, para o mesmo usuário).

## Consequências

Positivo: zero duplicação de infraestrutura de auth/shell, um único deploy, sidebar unificado.
Negativo: `apps/web` cresce em escopo (dois domínios de produto no mesmo app Next.js) — mitigado
mantendo o código do AYhub isolado em `features/ayhub/` e rotas sob `/ayhub`, sem misturar com
`features/pipeline`/`features/businesses`.
