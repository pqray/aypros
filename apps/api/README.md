# Aypros API

Backend Node/Fastify separado do `apps/web`.

## Papel

`apps/api` concentra endpoints de produto, regras de negocio, autorizacao, agregacoes e integracoes com Supabase/providers externos.

Fluxo padrao:

```txt
apps/web -> apps/api -> Supabase/Postgres
```

## Rodando com Docker

Modo recomendado para desenvolvimento local:

```bash
pnpm docker:api:build
pnpm docker:api:up
pnpm dev
```

A API fica em `http://localhost:4000`.

Comandos uteis:

```bash
pnpm docker:api:logs
pnpm docker:api:down
```

## Fallback sem Docker

Use apenas se o Docker Desktop nao estiver disponivel:

```bash
pnpm dev:api
```

## Endpoints

| Metodo | Rota | Uso |
|---|---|---|
| GET | `/health` | Healthcheck |
| GET | `/v1/app-context` | Contexto autenticado do shell |

## Env

Configurado via `.env.local` no compose.

Obrigatorio:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `WEB_ORIGINS`
- `API_PORT`

## Regras

- Novos endpoints de produto devem nascer aqui, nao em `apps/web/src/app/api`.
- Toda rota com dados de organizacao deve validar sessao e membership.
- Logs nao podem conter cookies, tokens ou secrets.
