# Fase 20 — Cadastro manual de empresas

## Objetivo

Permitir cadastrar manualmente uma empresa que não veio de uma pesquisa via Google Places (ex.: prospectada pelo Instagram), para que ela entre no mesmo fluxo de auditoria, score, pipeline, IA e PDF já existente para empresas descobertas automaticamente.

## Specs-base para leitura

`00-project-rules.md`, `04-database.md` (tabelas e visibilidade por organização), `08-business-discovery.md` (contrato de normalização/dedupe reaproveitado), `10-opportunity-scoring.md` (como `raw.segment`/`socialOnly` alimentam o score, sem mudança no algoritmo), `11-businesses-and-favorites.md` (tabela/detalhe onde a empresa cadastrada passa a aparecer), `14-data-fetching-state.md` (formulário RHF+Zod), `17-security.md` (autorização e rate limiting da criação), `19-backend-api.md` (contrato do endpoint). Ver também [ADR 011](../decisions/011-manual-business-registration.md) — decisão de arquitetura já tomada para esta fase.

## Dependências (instalar nesta fase)

Nenhuma nova.

## Arquivos esperados

- `packages/validation`: schema Zod do formulário de cadastro manual (nome, segmento, cidade/UF opcional, telefone opcional, site opcional, Instagram opcional — refine exigindo site OU Instagram).
- `packages/integrations/src/discovery`: função pura que monta um `DiscoveredBusiness` a partir do input manual, reaproveitando `normalizeWebsite`/`normalizePhone`; constante `MANUAL_PROVIDER = "manual"`.
- `apps/api/src/businesses.ts` (ou novo `apps/api/src/manual-businesses.ts`): endpoint `POST /v1/businesses` — cria `businesses`, uma `searches` sintética e o `search_results` correspondente, dentro de uma transação; retorna `businessId`.
- `apps/api/src/app.ts`: registro da rota.
- `packages/types`: request/response do endpoint de cadastro manual.
- `apps/web/src/features/businesses/*`: formulário (modal/drawer) de cadastro, botão de entrada na listagem de empresas, redirecionamento para `/businesses/:id` após criar.
- Testes de normalização, endpoint e formulário.

## Tarefas

1. Schema Zod do formulário (nome obrigatório, segmento obrigatório, telefone/site/Instagram opcionais com refine "site OU Instagram").
2. Função pura em `packages/integrations/discovery` que monta o `DiscoveredBusiness` manual a partir do input validado, reaproveitando os normalizadores existentes — com testes de fixture (site próprio, só Instagram, os dois).
3. Endpoint `POST /v1/businesses`: transação que insere em `businesses` (provider `manual`, `provider_place_id` gerado), cria `searches` (`status = completed`, `provider = manual`, `total_found = 1`) e `search_results` (posição 1); registra atividade (`business_created` ou equivalente).
4. Autorização: exigir membership na organização; rate limit básico de criações manuais por organização (mesma mecânica de `17-security.md`).
5. Frontend: botão "Cadastrar empresa" na listagem, formulário com RHF+Zod, feedback de sucesso/erro, redirecionamento para o detalhe da empresa criada.
6. Invalidar/atualizar cache de listagem de empresas (TanStack Query) após criação.

## Critérios de aceite

- [ ] Usuário consegue cadastrar uma empresa só com nome, segmento e Instagram (sem site) e ela aparece na listagem com o ícone de Instagram clicável e o ícone de site desabilitado.
- [ ] Usuário consegue cadastrar uma empresa com site próprio e auditar normalmente em seguida.
- [ ] Cadastro sem nome, sem segmento, ou sem site nem Instagram é rejeitado com mensagem clara.
- [ ] Empresa cadastrada manualmente funciona em favoritos, pipeline, IA e PDF sem nenhuma mudança nesses fluxos.
- [ ] Duas organizações diferentes cadastrando a "mesma" empresa manualmente não colidem nem vazam dados uma para a outra.
- [ ] `get_org_businesses_api` não foi alterada.

## Testes necessários

P0: normalização/montagem do `DiscoveredBusiness` manual (fixtures com site, com Instagram, com os dois, e validação rejeitando quando não há nenhum); autorização do endpoint (membro vs não-membro). P1: schema Zod do formulário (casos válidos/inválidos); endpoint cria `searches`+`search_results` corretamente e não duplica em caso de reenvio acidental (duplo clique). P2: formulário no frontend (submissão, erro de validação, redirecionamento).

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + cadastrar manualmente 2–3 empresas reais (uma só com Instagram, uma com site, uma tentativa inválida) e conferir listagem, auditoria, pipeline e PDF.

## Fora do escopo

Importação em lote (CSV) de empresas manuais; edição de nome/segmento/telefone depois de criado; métricas reais de Instagram (segue bloqueado em `18-roadmap.md`); mesclar automaticamente um cadastro manual com uma empresa depois encontrada pelo Google Places (decisão futura, só se virar problema real).

## Riscos

Cadastro duplicado da mesma empresa por engano, já que não há `provider_place_id` real para dedupe automático — mitigar com busca simples por nome antes de submeter e confirmação no formulário. Cadastro manual "poluindo" o histórico de buscas — mitigar com rótulo visual claro ("Cadastro manual") na lista de buscas.

## Checklist de conclusão

- [ ] Critérios de aceite verificados.
- [ ] Testes automatizados cobrindo P0/P1.
- [ ] Fluxo manual validado pelo usuário com empresas reais.
- [ ] Aprovação explícita antes da próxima fase.
