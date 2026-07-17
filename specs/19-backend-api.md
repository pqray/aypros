# 19 - Backend API

## Objetivo

`apps/api` e o backend Node separado do Aypros. Ele concentra regras de negocio, autorização, agregacoes, cache, rate limit futuro e integracoes com Supabase/providers externos.

## Responsabilidades

- Expor endpoints HTTP versionados em `/v1/*`.
- Validar entrada com Zod em toda fronteira.
- Verificar sessão e membership antes de acessar dados de organização.
- Agregar dados para reduzir round-trips do frontend.
- Encapsular Supabase/Postgres, providers externos, cache e logs.
- Retornar erros estaveis para o frontend tratar com TanStack Query.

## Fora do escopo

- UI, Server Components e componentes React.
- Regras de apresentação.
- Banco direto no frontend.
- Dados de produto em Zustand.

## Fluxo padrao

```txt
apps/web -> apps/api -> Supabase/Postgres
                 -> providers externos
```

`apps/web` deve chamar a API via `NEXT_PUBLIC_API_URL`. Novos endpoints de produto não devem nascer em `apps/web/src/app/api`; essa pasta fica reservada para necessidades específicas do Next, como callback de auth quando inevitável.

## Execucao local

Modo recomendado:

```bash
pnpm docker:api:up
pnpm dev
```

Comandos auxiliares:

```bash
pnpm docker:api:build
pnpm docker:api:logs
pnpm docker:api:down
```

A API escuta em `http://localhost:4000`; o web em `http://localhost:3000`.

`pnpm dev` sobe somente o web. A API deve ser iniciada separadamente por Docker. `pnpm dev:api` e `pnpm dev:all` existem apenas como fallback quando Docker não estiver disponível.

## Docker

- Dockerfile: `apps/api/Dockerfile`.
- Compose: `docker-compose.api.yml`.
- O container recebe env via `.env.local`.
- `API_HOST` deve ser `0.0.0.0` no container.
- `WEB_ORIGINS` controla CORS e aceita lista separada por vírgula.
- CORS deve permitir os métodos usados pelo app (`GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`) sem abrir origem além de `WEB_ORIGINS`.

## Endpoints atuais

| Metodo | Rota | Usó |
|---|---|---|
| GET | `/health` | Healthcheck do container/processó |
| GET | `/v1/app-context` | Contexto autenticado do shell: user, profile e organização ativa |
| POST | `/v1/searches` | Cria pesquisa de descoberta (valida, rate limit por org, reusa pesquisa identica <24h) e dispara execucao |
| GET | `/v1/searches` | Lista pesquisas da organização (páginado) |
| GET | `/v1/searches/:id` | Status/progressó de uma pesquisa (polling) |
| GET | `/v1/searches/:id/results` | Resultados persistidos da pesquisa (páginado, join com `businesses`) |
| POST | `/v1/searches/:id/retry` | Reexecuta pesquisa `failed`/`partial`/travada (idempotente, retomavel) |
| GET | `/v1/businesses/:businessId/audit-summary` | Retorna empresa, última auditoria HTTP e último score de oportunidade |
| POST | `/v1/businesses/:businessId/audit` | Executa auditoria HTTP individual, persiste audit/score e registra atividade |
| GET | `/v1/businesses` | Lista empresas da organização com filtros/ordenação/páginação server-side (RPC `get_org_businesses`) |
| GET | `/v1/businesses/export.csv` | Exporta a listagem filtrada (ou selecao) em CSV, com escaping contra formula injection; rate limit por org |
| POST | `/v1/businesses/:businessId/favorite` | Favorita a empresa (idempotente) |
| DELETE | `/v1/businesses/:businessId/favorite` | Remove favorito |
| POST | `/v1/businesses/batch/favorite` | Favorita em lote |
| POST | `/v1/businesses/batch/audit` | Audita em lote (reusa o fluxo de auditoria individual) |
| GET | `/v1/saved-filters` | Lista filtros salvos da organização |
| POST | `/v1/saved-filters` | Cria filtro salvo |
| DELETE | `/v1/saved-filters/:id` | Remove filtro salvo |
| GET | `/v1/pipeline` | Lista leads da organização com empresa e score embutidos (Kanban monta as colunas no cliente) |
| POST | `/v1/leads` | Cria lead a partir de uma empresa (idempotente: reusa lead existente pela constraint org+empresa) |
| POST | `/v1/leads/batch` | Cria leads em lote a partir de uma selecao de empresas |
| GET | `/v1/leads/:id` | Detalhe do lead: empresa, notas e timeline de atividades |
| PATCH | `/v1/leads/:id` | Move estágio/position (drag ou menu), edita status/valor/próxima ação; reindexação simples da coluna |
| POST | `/v1/leads/:id/notes` | Cria nota no lead e registra atividade |
| PATCH | `/v1/notes/:id` | Edita nota |
| DELETE | `/v1/notes/:id` | Remove nota |
| GET | `/v1/businesses/:businessId/ai-generations` | Lista gerações de IA da empresa na organização (rascunhos recentes por kind) |
| POST | `/v1/businesses/:businessId/ai-generations` | Gera conteúdo com Groq (`summary-v2`, `whatsapp-v2`, `email-v4`): input estruturado do banco, Zod no output, rate limit diário por org, persiste em `ai_generations` e registra atividade; 503 se `GROQ_API_KEY` ausente |
| POST | `/v1/businesses/:businessId/refresh` | Refresh manual de dados da empresa (Place Details + re-auditoria + score), respeitando caps de custo |
| GET | `/v1/businesses/:businessId/report` | JSON do diagnóstico comercial usado pela UI: resumo, score, nota HTTP amigável, achados, maturidade, recomendações e próximos passos |
| GET | `/v1/businesses/:businessId/report.pdf` | PDF de diagnóstico v2 (resumo executivo, barra de score, maturidade por eixo, recomendações priorizadas); rate limit por org |
| DELETE | `/v1/leads/:id` | Remove o lead do pipeline (empresa intacta, notas em cascata, activities preservadas via SET NULL) e registra `lead_archived` |
| POST | `/v1/leads/:id/contacts` | Registra contato (canal + nota), atualiza `last_contact_at` e cria atividade `lead_contacted` |
| GET | `/v1/organization/members` | Lista membros da organização (para atribuição de leads) |
| POST | `/v1/organization/members` | Adiciona membro já cadastrado por e-mail (owner/admin) |

## Padroes de implementação

- Entrypoint: `apps/api/src/server.ts`.
- Factory testavel: `apps/api/src/app.ts`.
- Services por dominio em arquivos dedicados dentro de `apps/api/src`.
- Contratos compartilhados em `packages/types`.
- Schemas de entrada em `packages/validation` quando também forem usados pelo web; schemas internos podem ficar na API.
- Respostas devem ser pequenas, agregadas e pensadas para cache no TanStack Query.
- Toda rota paginada deve retornar o contrato compartilhado `PaginationMeta`: `page`, `pageSize`, `total`, `totalPages`, `hasNextPage` e `hasPreviousPage`.
- Telas paginadas devem consumir os flags do backend em vez de recalcular paginaÃ§Ã£o no cliente.

## Performance

Separar a API não e, por si so, otimização. Os ganhos vem de:

- endpoints agregados em vez de varias queries por tela;
- indices e RPCs quando fizer sentido;
- cache HTTP/TanStack Query;
- evitar fetch duplicado no frontend;
- reaproveitar o contexto autenticado (`orgId`, `userId`, nome da organizaÃ§Ã£o e nome do usuÃ¡rio) quando a rota jÃ¡ chamou `requireOrgContext`;
- polling somente para processos nÃ£o-terminais, com intervalos diferentes para status leve e listas pesadas;
- logs de tempo por request e metricas futuras.

## Seguranca

- Nunca logar cookies, tokens ou secrets.
- CORS restrito por `WEB_ORIGINS`.
- Usar anon key + cookies do usuário para caminhos que dependem de RLS.
- Usar service role somente em services server-side que realmente precisam contornar RLS.
- Toda rota de dados de organização deve validar membership mesmo com RLS ativo.
