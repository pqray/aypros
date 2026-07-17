# Fase 07 - Auditoria HTTP + Score

## Objetivo

Servico de analise HTTP com protecao SSRF completa, deteccoes com evidencias, e calculo/persistencia do score de oportunidade.

## Specs-base para leitura

`00-project-rules.md`, `09-website-http-audit.md`, `10-opportunity-scoring.md`, `17-security.md` (SSRF, rate limiting), `16-testing.md` (P0), `02-architecture.md` (consulta: processos assincronos).

## Dependencias (instalar nesta fase)

Parser de HTML server-side leve: `cheerio` (registrado em `specs/decisions/006-html-parser.md`). Sem browser.

## Arquivos esperados

- `packages/integrations/audit/*`: normalizacao de URL, guarda SSRF (modulo isolado e testado), fetch com timeout/redirects manuais/limite de tamanho, parser de deteccoes com evidencias.
- `packages/scoring/*`: algoritmo v1 completo (puro) + testes de tabela.
- `apps/api`: execucao de auditoria individual e em lote (estados no banco), persistencia em `website_audits` e `opportunity_scores`, recalculo pos-auditoria, atividade `audit_completed`.
- `apps/web`: detalhe minimo de empresa com score/auditoria e acao de reanalise. Tela rica fica para Fase 08.

## Tarefas

1. Guarda SSRF: resolucao DNS, bloqueio de faixas privadas/loopback/metadata, revalidacao por redirect.
2. Fetch controlado (timeouts, max. 5 redirects, 2 MB, so `text/html`).
3. Deteccoes + evidencias + estados `inconclusive` (heuristica SPA).
4. Scoring v1 com pesos da spec 10; `algorithm_version = v1`.
5. Auditoria em lote pos-pesquisa (pequena concorrencia, estados no banco, retomavel).
6. Rate limit de auditorias por org.

## Criterios de aceite

- [x] SSRF: todos os casos P0 bloqueados (testes passando)
- [x] Site fora do ar gera auditoria `completed` com achado (nao `failed`)
- [x] SPA vazio marca deteccoes como `inconclusive`, nao como site ruim
- [x] Score deterministico, com reasons e clamp 0-100; historico append-only
- [x] Empresa sem site recebe score sem auditoria (confidence `low`)

## Testes necessarios

**P0 completos** (`16-testing.md`): SSRF, parser com fixtures HTML, scoring (casos de tabela). Sao o coracao do produto; sem eles a fase nao conclui.

## Comandos de validacao

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + auditoria manual de 3 sites reais variados (moderno, antigo, fora do ar).

## Fora do escopo

Screenshots/Playwright (roadmap); exibicao rica na pagina da empresa (Fase 8 - aqui basta persistir e expor via API).

## Riscos

SSRF e o maior risco de seguranca do produto: modulo isolado, testado e revisado; falsos positivos de deteccao geram scores enganosos (preferir `inconclusive` a chute).

## Checklist de conclusao

- [x] P0 verdes
- [x] ADR do parser HTML registrado
- [x] Aprovacao antes da Fase 08
