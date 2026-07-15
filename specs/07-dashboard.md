# 07 — Dashboard

Primeira tela após login. Objetivo: orientar a próxima ação de prospecção. **Somente dados reais — nunca números falsos.** Sem dados, mostrar empty states com CTA.

## Blocos

| Bloco | Conteúdo | Fonte |
|---|---|---|
| Cards de métricas | pesquisas realizadas, empresas descobertas, empresas sem site, leads no pipeline (período: total ou últimos 30 dias) | agregações por `organization_id` (Server Component) |
| Busca rápida | formulário compacto cidade + segmento → redireciona para `/discovery` com params na URL | — |
| Oportunidades em destaque | top N empresas por score (score alto + sem lead criado), com nível e motivo principal; ação: ver detalhe / adicionar ao pipeline | `opportunity_scores` + `businesses` |
| Pesquisas recentes | últimas pesquisas com status e contagem; link para resultados | `searches` |
| Atividades recentes | timeline compacta das últimas atividades da organização | `activities` |

## Empty states

- Organização nova: hero de boas-vindas + CTA "Fazer primeira pesquisa"; cards mostram zero de forma honesta ("Nenhuma pesquisa ainda") e blocos vazios explicam como preencher.
- Cada bloco tem seu próprio empty state (ex.: pipeline vazio ≠ sem pesquisas).

## Dados e estado

- Primeira renderização: Server Components com queries agregadas.
- Blocos que mudam com interação (atividades) podem hidratar com TanStack Query usando `initialData` (ver `14-data-fetching-state.md`).
- Sem polling no dashboard.

## UI

- Grid responsivo: 4 cards no desktop → 2 → 1 no mobile.
- Cores de nível de oportunidade usam tokens semânticos (`03-design-system.md`); verde só em oportunidade alta/success.
- Skeletons durante carregamento; sem animação decorativa.
