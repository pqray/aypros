# Setup local — Aypros

Guia completo para rodar o projeto do zero. Visão geral do produto e comandos resumidos no [README](../README.md); specs em [`/specs`](../specs/README.md).

## Pré-requisitos

- **Node.js >= 20** e **pnpm 11** (`npm i -g pnpm`)
- **Docker Desktop** (opcional — só para rodar a API em container; há fallback sem Docker)
- Conta no **Supabase**, chave do **Google Places API (New)** e chave da **Groq**

## 1. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha em `.env.local` (nunca commite valores reais — `.env*` está no gitignore):

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | idem — publishable key (`sb_publishable_...`), segura no cliente |
| `SUPABASE_SERVICE_ROLE_KEY` | idem — secret key (`sb_secret_...`); **somente server-side**, contorna RLS |
| `SUPABASE_PROJECT_ID` | ref do projeto (usado pela CLI) |
| `DATABASE_URL` | Settings → Database → connection string do pooler (usada pelo Drizzle e scripts) |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` em dev |
| `WEB_ORIGINS` | allow-list de CORS da API — `http://localhost:3000` em dev |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console → OAuth app (login com Google via Supabase Auth) |
| `GROQ_API_KEY` | console.groq.com → API Keys; **somente server-side**. Opcional: sem ela a geração com IA responde 503 e o resto do produto funciona |
| `GOOGLE_PLACES_API_KEY` | Google Cloud Console, com a **Places API (New)** habilitada e billing ativo; restrinja a chave a essa API |

Dica de custo (Places): configure uma quota diária de ~30 `SearchTextRequest per day` no Google Cloud Console — com o free tier de 1.000 chamadas/mês fica matematicamente impossível gerar cobrança.

## 2. Banco (Supabase)

As migrations vivem em [`supabase/migrations`](../supabase/migrations). Com a CLI do Supabase logada e o projeto linkado:

```bash
supabase link --project-ref <SUPABASE_PROJECT_ID>
supabase db push
```

Isso cria tabelas, enums, índices, funções (`is_org_member`, RPCs de dashboard/listagem) e todas as políticas de RLS.

## 3. Instalar e rodar

```bash
pnpm install

# API (escolha um):
pnpm docker:api:up   # em Docker (recomendado)
pnpm dev:api         # fallback sem Docker

# Web:
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:4000` (healthcheck em `/health`)

Primeiro acesso: crie uma conta em `/cadastro` (ou login Google) e complete o onboarding — ele cria sua organização.

## 4. Qualidade

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Testes são Vitest + Testing Library, priorizados por risco (specs/16): scoring, SSRF, parser de auditoria, normalização, CSV e schemas Zod são os P0/P1.

## Solução de problemas

- **API não sobe / 500 no boot** — variável obrigatória faltando no `.env.local`; o Zod de `apps/api/src/env.ts` lista o que falta no erro.
- **Pesquisa retorna erro de provider** — confira billing e a habilitação da *Places API (New)* (é diferente da Places API legada) no projeto da chave.
- **Geração com IA responde 503** — `GROQ_API_KEY` ausente; preencha e reinicie a API.
- **CORS bloqueado no browser** — origem do web precisa estar em `WEB_ORIGINS` (em dev, localhost já é liberado automaticamente).
