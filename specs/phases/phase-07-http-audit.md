# Fase 07 — Auditoria HTTP + Score

## Objetivo

Serviço de análise HTTP com proteção SSRF completa, detecções com evidências, e cálculo/persistência do score de oportunidade.

## Specs-base para leitura

`00-project-rules.md`, `09-website-http-audit.md`, `10-opportunity-scoring.md`, `17-security.md` (SSRF, rate limiting), `16-testing.md` (P0), `02-architecture.md` (consulta: processos assíncronos).

## Dependências (instalar nesta fase)

Parser de HTML server-side leve (ex.: cheerio ou parse5 — registrar escolha). Sem browser.

## Arquivos esperados

- `packages/integrations/audit/*`: normalização de URL, guarda SSRF (módulo isolado e testado), fetch com timeout/redirects manuais/limite de tamanho, parser de detecções com evidências.
- `packages/scoring/*`: algoritmo v1 completo (puro) + testes de tabela.
- `apps/web`: execução de auditoria individual e em lote (estados no banco), persistência em `website_audits` e `opportunity_scores`, recálculo pós-auditoria, atividade `audit_completed`.

## Tarefas

1. Guarda SSRF: resolução DNS, bloqueio de faixas privadas/loopback/metadata, revalidação por redirect.
2. Fetch controlado (timeouts, máx. 5 redirects, 2 MB, só `text/html`).
3. Detecções + evidências + estados `inconclusive` (heurística SPA).
4. Scoring v1 com pesos da spec 10; `algorithm_version = v1`.
5. Auditoria em lote pós-pesquisa (pequena concorrência, estados no banco, retomável).
6. Rate limit de auditorias por org.

## Critérios de aceite

- [ ] SSRF: todos os casos P0 bloqueados (testes passando)
- [ ] Site fora do ar gera auditoria `completed` com achado (não `failed`)
- [ ] SPA vazio marca detecções como `inconclusive`, não como site ruim
- [ ] Score determinístico, com reasons e clamp 0–100; histórico append-only
- [ ] Empresa sem site recebe score sem auditoria (confidence `low`)

## Testes necessários

**P0 completos** (`16-testing.md`): SSRF, parser com fixtures HTML, scoring (casos de tabela). São o coração do produto — sem eles a fase não conclui.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + auditoria manual de 3 sites reais variados (moderno, antigo, fora do ar).

## Fora do escopo

Screenshots/Playwright (roadmap); exibição rica na página da empresa (Fase 8 — aqui basta persistir e expor via API).

## Riscos

SSRF é o maior risco de segurança do produto — módulo isolado, testado e revisado; falsos positivos de detecção geram scores enganosos (preferir `inconclusive` a chute).

## Checklist de conclusão

- [ ] P0 verdes
- [ ] ADR do parser HTML registrado
- [ ] Aprovação antes da Fase 08
