# Specs — Índice e Instruções de Uso

Este diretório é a **fonte oficial de verdade** do projeto. A implementação acontece **uma fase por vez**, com aprovação do usuário entre fases.

## Como usar (obrigatório para qualquer agente/dev)

Antes de implementar uma fase, ler **somente**:

1. `00-project-rules.md` (sempre);
2. `phases/phase-XX-*.md` da fase atual;
3. As specs de domínio listadas na seção **"Specs-base para leitura"** da própria fase — e nenhuma outra.

**Não** reler todas as specs a cada etapa. Não reler banco completo, Groq, pipeline, auditoria ou roadmap, salvo quando a fase listar essas specs como dependência. Informação compartilhada vive em uma única spec e é referenciada — em caso de dúvida pontual, consultar apenas a seção relevante da spec referenciada.

Exemplo — Fase 5 (Dashboard) lê: `00`, `phases/phase-05-dashboard.md`, `03`, `06`, `07`, `14`, `15`.

## Índice — specs de domínio

| Arquivo | Escopo |
|---|---|
| [00-project-rules.md](00-project-rules.md) | Regras gerais, stack, idioma, qualidade, proibições |
| [01-product-overview.md](01-product-overview.md) | Visão, público, escopo do MVP, conceitos |
| [02-architecture.md](02-architecture.md) | Monorepo, fluxo de dados, server/client, processos assíncronos |
| [03-design-system.md](03-design-system.md) | Paleta, tokens, temas, tipografia, ícones, animações, a11y |
| [04-database.md](04-database.md) | Entidades, tabelas, enums, RLS, histórico |
| [05-auth-onboarding.md](05-auth-onboarding.md) | Login, cadastro, Google, sessão, onboarding, organizações |
| [06-app-shell-navigation.md](06-app-shell-navigation.md) | Sidebar, topbar, rotas, command palette, mobile |
| [07-dashboard.md](07-dashboard.md) | Cards, oportunidades, atividades, empty states |
| [08-business-discovery.md](08-business-discovery.md) | Provider, normalização, deduplicação, fluxo de pesquisa |
| [09-website-http-audit.md](09-website-http-audit.md) | Análise HTTP, SSRF, detecções, evidências |
| [10-opportunity-scoring.md](10-opportunity-scoring.md) | Score 0–100, pesos, confiança, versionamento |
| [11-businesses-and-favorites.md](11-businesses-and-favorites.md) | Tabela, filtros, detalhe, favoritos, CSV |
| [12-pipeline-crm.md](12-pipeline-crm.md) | Kanban, estágios, notas, atividades |
| [13-ai-groq.md](13-ai-groq.md) | Groq, prompts versionados, outputs JSON, limites |
| [14-data-fetching-state.md](14-data-fetching-state.md) | TanStack Query, URL state, Zustand, RHF+Zod |
| [15-components-and-features.md](15-components-and-features.md) | packages/ui, organização por feature, limites |
| [16-testing.md](16-testing.md) | Prioridades de teste, regras, comandos |
| [17-security.md](17-security.md) | RLS, autorização, SSRF, secrets, rate limiting |
| [18-roadmap.md](18-roadmap.md) | Evolução pós-MVP |
| [19-backend-api.md](19-backend-api.md) | Backend Node separado, Docker, endpoints e contratos |
| [20-data-refresh.md](20-data-refresh.md) | Refresh automático de dados: frescor, custo, scheduler |

## Índice — fases (`/specs/phases/`)

| Fase | Entrega |
|---|---|
| [01 — Foundation](phases/phase-01-foundation.md) | Monorepo, tooling, packages vazios |
| [02 — Design System](phases/phase-02-design-system.md) | Tokens, temas, packages/ui base |
| [03 — Supabase + Auth](phases/phase-03-supabase-auth.md) | Banco, RLS, auth, onboarding, orgs |
| [04 — App Shell](phases/phase-04-app-shell.md) | Sidebar, topbar, rotas, palette, temas |
| [05 — Dashboard](phases/phase-05-dashboard.md) | Dashboard com dados reais/empty states |
| [06 — Discovery](phases/phase-06-discovery.md) | Provider real, pesquisa, resultados |
| [07 — HTTP Audit](phases/phase-07-http-audit.md) | Auditoria HTTP + SSRF + scoring |
| [08 — Businesses](phases/phase-08-businesses.md) | Tabela, filtros, detalhe, favoritos, CSV |
| [09 — Pipeline](phases/phase-09-pipeline.md) | Kanban, notas, atividades |
| [10 — Groq](phases/phase-10-groq.md) | Resumos e mensagens com IA |
| [11 — Finish](phases/phase-11-finish.md) | A11y, responsividade, polimento, testes finais |
| [12 — Data Refresh](phases/phase-12-data-refresh.md) | Refresh automático de empresas ativas + refresh manual |
| [13 — Outreach](phases/phase-13-outreach.md) | Registro de contato, wa.me com rascunho, bloco "Hoje" |
| [14 — Diagnostic Report](phases/phase-14-diagnostic-report.md) | PDF de diagnóstico apresentável ao cliente |
| [15 — Segment Audit](phases/phase-15-segment-audit.md) | Detecções por segmento (cardápio, delivery, link-in-bio) + score v2 |
| [16 — Lead Owner](phases/phase-16-lead-owner.md) | Responsável pelo lead, filtro "meus", avatar no Kanban |

## Decisões

ADRs em [decisions/](decisions/README.md) — inclui a lista de **decisões pendentes**.
