# 005 - Backend Node separado em Docker

- **Data**: 2026-07-15
- **Status**: aceita

## Contexto

O app comecou usando Route Handlers do Next para API. Isso funciona tecnicamente, mas deixa regra de negocio dentro de `apps/web` e dificulta evoluir discovery, auditoria, pipeline, logs, cache e integracoes pesadas sem transformar o frontend em backend.

## Decisao

Criar `apps/api` como backend Node separado com Fastify. Em desenvolvimento local, a API deve ser iniciada preferencialmente via Docker Compose (`docker-compose.api.yml`) e escutar em `http://localhost:4000`. O web consome a API por `NEXT_PUBLIC_API_URL`.

Fluxo alvo:

```txt
apps/web -> apps/api -> Supabase/Postgres
```

## Alternativas consideradas

- **Next Route Handlers em `apps/web`** - simples, mas acopla produto ao frontend e reduz clareza de ownership.
- **NestJS** - estrutura forte, mas adiciona peso antes de o dominio justificar.
- **Express** - conhecido, mas Fastify oferece melhor tipagem/performance e plugins modernos.
- **Serverless-only** - bom para Next, mas discovery/auditoria tendem a exigir controle melhor de tempo, jobs e observabilidade.

## Consequencias

- Novos endpoints de produto devem nascer em `apps/api`.
- `apps/web/src/app/api` fica reservado para casos especificos do Next, como callbacks de auth.
- Desenvolvimento local passa a ter dois processos: web e API.
- Deploy futuro precisa hospedar `apps/web` e `apps/api` separadamente.
- Docker local melhora isolamento, mas exige manter env e CORS sincronizados.
