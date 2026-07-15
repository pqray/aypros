# 17 — Segurança

## Autorização em camadas

1. **Middleware/layouts**: exige sessão em `(app)` (`05-auth-onboarding.md`).
2. **Server Actions / Route Handlers**: toda operação valida sessão + membership na organização alvo + papel quando exigido (`owner` gerencia org/membros; `admin`+ deleta dados; `member` usa o produto). Nunca confiar em `organization_id` vindo do cliente sem verificar membership.
3. **RLS (Supabase)**: rede de segurança final.

## RLS

- Habilitado em todas as tabelas do schema público.
- Tabelas escopadas por org (`searches`, `favorites`, `saved_filters`, `leads`, `notes`, `activities`, `ai_generations`, `website_audits` por org): política de SELECT/INSERT/UPDATE/DELETE condicionada a membership via `organization_members` (função `is_org_member(org_id)` `security definer`).
- `profiles`: `id = auth.uid()`.
- `businesses`/`opportunity_scores`: SELECT para autenticados; escrita bloqueada para clientes (só service role/server).

## Service role

- `SUPABASE_SERVICE_ROLE_KEY` usada apenas em código server-side que precisa contornar RLS (upsert de `businesses`, escrita de audits/scores). Nunca importada em client components (import boundary `server-only`).

## SSRF

Ver regras completas em `09-website-http-audit.md` (validação de IP por resolução DNS, bloqueio de faixas privadas/metadata, revalidação por redirect, limites de tamanho). Testes P0 em `16-testing.md`. Aplica-se a **qualquer** URL fornecida externamente (sites de empresas vindos do provider incluídos — são entrada não confiável).

## Secrets

- Somente env vars: chaves Supabase, provider de descoberta, Groq. `.env.local` no gitignore; `.env.example` sem valores.
- Nenhum secret em `NEXT_PUBLIC_*` além das chaves públicas do Supabase (anon key).

## Validação e sanitização

- Zod em toda fronteira: formulários, query params, bodies, respostas de providers e da Groq.
- Conteúdo de terceiros (nomes de empresas, HTML auditado, saída da IA) tratado como não confiável: nunca `dangerouslySetInnerHTML`; render como texto.
- CSV: prefixar células iniciadas em `=`, `+`, `-`, `@` (formula injection) e escapar corretamente.
- URLs exibidas/linkadas: só `http(s)`.

## Rate limiting e limites

MVP sem Redis → contadores no banco por organização + janela de tempo:

| Recurso | Limite (config em `packages/config`) |
|---|---|
| Pesquisas | N/hora por org |
| Auditorias | N/hora por org |
| Gerações IA | N/dia por org |
| Export CSV | N/hora por org |

Excedeu → erro claro na UI com tempo restante. Limites de payload nas rotas (bodies pequenos, tamanho máximo de resposta HTTP auditada).

## Logs

- Server-side estruturado; nunca logar secrets, tokens, cookies ou conteúdo integral de dados pessoais.
- Erros de provider registrados com código e contexto mínimo.
