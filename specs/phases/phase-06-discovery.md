# Fase 06 — Descoberta de Empresas

## Objetivo

Pesquisa por cidade + segmento com provider real, normalização, deduplicação, progresso por estados no banco e resultados persistidos.

## Specs-base para leitura

`00-project-rules.md`, `08-business-discovery.md`, `02-architecture.md` (processos assíncronos), `14-data-fetching-state.md`, `17-security.md` (rate limiting), `04-database.md` (consulta: `searches`, `businesses`, `search_results`).

## Dependências (instalar nesta fase)

SDK/client do provider escolhido (ADR pendente #1 — **decidir no início desta fase**).

## Arquivos esperados

- `packages/integrations/discovery/*`: interface `DiscoveryProvider`, implementação real, normalização (telefone, URL, `social_only`), erros tipados.
- Mock provider + fixtures em arquivos de teste.
- `features/discovery/*`: formulário (RHF+Zod, params na URL), execução (Route Handler/Server Action), polling de progresso, lista de resultados incremental.
- Rota `/discovery` e `/searches` funcionais.

## Tarefas

1. ADR do provider (custo, termos de cache, qualidade BR).
2. Implementar interface + provider real + normalização + dedupe (upsert por `provider`+`provider_place_id`).
3. Fluxo `pending → processing → completed|partial|failed` em lotes dentro do limite serverless.
4. Polling com TanStack Query (para em estado terminal).
5. Cache de pesquisa repetida (<24h) e limite de resultados por pesquisa.
6. Rate limit de pesquisas por org (contador no banco).
7. Tratamento de erros do provider com mensagens claras.

## Critérios de aceite

- [ ] Pesquisa real retorna empresas persistidas e deduplicadas
- [ ] Progresso visível; `partial`/`failed` com mensagens úteis
- [ ] URL reflete cidade/segmento (compartilhável)
- [ ] Mock provider inacessível em produção
- [ ] Chave do provider só em env server-side

## Testes necessários

P1 de `16-testing.md`: normalização (telefone/URL/social_only), dedupe, mapeamento resposta→modelo e erros do provider (com fixtures).

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + pesquisa real manual em cidade/segmento conhecidos.

## Fora do escopo

Auditoria HTTP e score (Fase 7); tabela rica com filtros (Fase 8 — aqui basta listagem simples dos resultados).

## Riscos

Custo/quota do provider (limitar cedo); termos de uso sobre cache de dados; timeout serverless em pesquisas grandes (lotes pequenos e retomáveis).

## Checklist de conclusão

- [ ] ADR #1 registrado
- [ ] Critérios verificados com pesquisa real
- [ ] Aprovação antes da Fase 07
