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
