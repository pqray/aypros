# 16 — Testes

Vitest + Testing Library. Testes vivem junto do código (`*.test.ts(x)`). Rodáveis por package e na raiz via Turborepo. Sem meta de cobertura numérica global — cobertura **priorizada por risco**.

## Prioridades de cobertura

| Prioridade | Alvo | Tipo |
|---|---|---|
| P0 | `packages/scoring` — regras, pesos, clamp, level, confidence, reasons | unit (casos de tabela — `10-opportunity-scoring.md`) |
| P0 | Proteção SSRF — IPs privados, loopback, metadata, redirect malicioso, DNS para IP interno | unit |
| P0 | Parser da auditoria HTTP — detecções sobre fixtures de HTML (com/sem viewport, title, SPA vazio, social links) | unit |
| P0 | Normalização/deduplicação de empresas (telefone, URL, `social_only`, upsert key) | unit |
| P1 | Providers de descoberta — mapeamento de resposta→modelo e de erros, usando **mock provider/fixtures** | unit |
| P1 | Geração de CSV — escaping, injection, colunas | unit |
| P1 | Schemas Zod compartilhados (validação de formulários e de output da Groq) | unit |
| P2 | Componentes críticos — ScoreBadge, tabela (render/empty/erro), formulário de busca, card do Kanban | component (Testing Library) |
| P2 | Server Actions principais — autorização (membro vs não-membro) com banco mockado | unit/integration |

## Regras

- Provider mock e fixtures HTTP existem **somente** em arquivos de teste/fixtures — nunca importados por código de produção.
- Sem rede real em testes (fetch mockado); sem depender de Supabase real em unit tests.
- Testes de scoring são o contrato do algoritmo: mudar peso sem atualizar teste + versão + ADR é violação (`10-opportunity-scoring.md`).
- Cada fase lista seus testes obrigatórios no critério de aceite (specs de fase).

## Comandos

`pnpm test` (raiz, via turbo), `pnpm test --filter <package>`, watch local. CI futura roda lint + typecheck + test + build.
