# 19 - Backend API

## Objetivo

`apps/api` e o backend Node separado do Aypros. Ele concentra regras de negocio, autorizacao, agregacoes, cache, rate limit futuro e integracoes com Supabase/providers externos.

## Responsabilidades

- Expor endpoints HTTP versionados em `/v1/*`.
- Validar entrada com Zod em toda fronteira.
- Verificar sessao e membership antes de acessar dados de organizacao.
- Agregar dados para reduzir round-trips do frontend.
- Encapsular Supabase/Postgres, providers externos, cache e logs.
- Retornar erros estaveis para o frontend tratar com TanStack Query.

## Fora do escopo

- UI, Server Components e componentes React.
- Regras de apresentacao.
- Banco direto no frontend.
- Dados de produto em Zustand.

## Fluxo padrao

```txt
apps/web -> apps/api -> Supabase/Postgres
                 -> providers externos
```

`apps/web` deve chamar a API via `NEXT_PUBLIC_API_URL`. Novos endpoints de produto nao devem nascer em `apps/web/src/app/api`; essa pasta fica reservada para necessidades especificas do Next, como callback de auth quando inevitavel.

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

`pnpm dev` sobe somente o web. A API deve ser iniciada separadamente por Docker. `pnpm dev:api` e `pnpm dev:all` existem apenas como fallback quando Docker nao estiver disponivel.

## Docker

- Dockerfile: `apps/api/Dockerfile`.
- Compose: `docker-compose.api.yml`.
- O container recebe env via `.env.local`.
- `API_HOST` deve ser `0.0.0.0` no container.
- `WEB_ORIGINS` controla CORS e aceita lista separada por virgula.

## Endpoints atuais

| Metodo | Rota | Uso |
|---|---|---|
| GET | `/health` | Healthcheck do container/processo |
| GET | `/v1/app-context` | Contexto autenticado do shell: user, profile e organizacao ativa |
| POST | `/v1/searches` | Cria pesquisa de descoberta (valida, rate limit por org, reusa pesquisa identica <24h) e dispara execucao |
| GET | `/v1/searches` | Lista pesquisas da organizacao (paginado) |
| GET | `/v1/searches/:id` | Status/progresso de uma pesquisa (polling) |
| GET | `/v1/searches/:id/results` | Resultados persistidos da pesquisa (paginado, join com `businesses`) |
| POST | `/v1/searches/:id/retry` | Reexecuta pesquisa `failed`/`partial`/travada (idempotente, retomavel) |
| GET | `/v1/businesses/:businessId/audit-summary` | Retorna empresa, ultima auditoria HTTP e ultimo score de oportunidade |
| POST | `/v1/businesses/:businessId/audit` | Executa auditoria HTTP individual, persiste audit/score e registra atividade |
| GET | `/v1/businesses` | Lista empresas da organizacao com filtros/ordenacao/paginacao server-side (RPC `get_org_businesses`) |
| GET | `/v1/businesses/export.csv` | Exporta a listagem filtrada (ou selecao) em CSV, com escaping contra formula injection; rate limit por org |
| POST | `/v1/businesses/:businessId/favorite` | Favorita a empresa (idempotente) |
| DELETE | `/v1/businesses/:businessId/favorite` | Remove favorito |
| POST | `/v1/businesses/batch/favorite` | Favorita em lote |
| POST | `/v1/businesses/batch/audit` | Audita em lote (reusa o fluxo de auditoria individual) |
| GET | `/v1/saved-filters` | Lista filtros salvos da organizacao |
| POST | `/v1/saved-filters` | Cria filtro salvo |
| DELETE | `/v1/saved-filters/:id` | Remove filtro salvo |
| GET | `/v1/pipeline` | Lista leads da organizacao com empresa e score embutidos (Kanban monta as colunas no cliente) |
| POST | `/v1/leads` | Cria lead a partir de uma empresa (idempotente: reusa lead existente pela constraint org+empresa) |
| POST | `/v1/leads/batch` | Cria leads em lote a partir de uma selecao de empresas |
| GET | `/v1/leads/:id` | Detalhe do lead: empresa, notas e timeline de atividades |
| PATCH | `/v1/leads/:id` | Move estagio/position (drag ou menu), edita status/valor/proxima acao; reindexacao simples da coluna |
| POST | `/v1/leads/:id/notes` | Cria nota no lead e registra atividade |
| PATCH | `/v1/notes/:id` | Edita nota |
| DELETE | `/v1/notes/:id` | Remove nota |
| GET | `/v1/businesses/:businessId/ai-generations` | Lista geracoes de IA da empresa na organizacao (rascunhos recentes por kind) |
| POST | `/v1/businesses/:businessId/ai-generations` | Gera conteudo com Groq (summary/whatsapp/email v2): input estruturado do banco, Zod no output, rate limit diario por org, persiste em `ai_generations` e registra atividade; 503 se `GROQ_API_KEY` ausente |
| POST | `/v1/businesses/:businessId/refresh` | Refresh manual de dados da empresa (Place Details + re-auditoria + score), respeitando caps de custo |
| GET | `/v1/businesses/:businessId/report.pdf` | PDF de diagnostico v2 (resumo executivo, barra de score, maturidade por eixo, recomendacoes priorizadas); rate limit por org |
| DELETE | `/v1/leads/:id` | Remove o lead do pipeline (empresa intacta, notas em cascata, activities preservadas via SET NULL) e registra `lead_archived` |
| POST | `/v1/leads/:id/contacts` | Registra contato (canal + nota), atualiza `last_contact_at` e cria atividade `lead_contacted` |
| GET | `/v1/organization/members` | Lista membros da organizacao (para atribuicao de leads) |
| POST | `/v1/organization/members` | Adiciona membro ja cadastrado por e-mail (owner/admin) |

## Padroes de implementacao

- Entrypoint: `apps/api/src/server.ts`.
- Factory testavel: `apps/api/src/app.ts`.
- Services por dominio em arquivos dedicados dentro de `apps/api/src`.
- Contratos compartilhados em `packages/types`.
- Schemas de entrada em `packages/validation` quando tambem forem usados pelo web; schemas internos podem ficar na API.
- Respostas devem ser pequenas, agregadas e pensadas para cache no TanStack Query.

## Performance

Separar a API nao e, por si so, otimizacao. Os ganhos vem de:

- endpoints agregados em vez de varias queries por tela;
- indices e RPCs quando fizer sentido;
- cache HTTP/TanStack Query;
- evitar fetch duplicado no frontend;
- logs de tempo por request e metricas futuras.

## Seguranca

- Nunca logar cookies, tokens ou secrets.
- CORS restrito por `WEB_ORIGINS`.
- Usar anon key + cookies do usuario para caminhos que dependem de RLS.
- Usar service role somente em services server-side que realmente precisam contornar RLS.
- Toda rota de dados de organizacao deve validar membership mesmo com RLS ativo.
