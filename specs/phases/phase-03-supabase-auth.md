# Fase 03 — Supabase + Auth + Onboarding

## Objetivo

Banco completo com RLS, autenticação (e-mail/senha + Google), onboarding e organizações funcionando.

## Specs-base para leitura

`00-project-rules.md`, `04-database.md`, `05-auth-onboarding.md`, `17-security.md`, `14-data-fetching-state.md` (seções Server Components e RHF+Zod).

## Dependências (instalar nesta fase)

`@supabase/supabase-js`, `@supabase/ssr`, Drizzle ORM + drizzle-kit, Zod, React Hook Form + resolvers, TanStack Query (setup do provider).

## Arquivos esperados

- `/supabase/migrations/*`: todas as tabelas, enums, índices, triggers (profile on signup), funções RLS e políticas de `04-database.md`.
- `packages/database`: schema Drizzle espelhando as migrations, clients (server), tipos exportados.
- `packages/validation`: schemas de auth, onboarding, organização.
- `apps/web`: grupo `(auth)` (login, cadastro, reset), middleware de sessão, layout protegido `(app)`, fluxo `/onboarding`, `settings/profile` e `settings/organization` básicos, seleção de organização ativa.

## Tarefas

1. Configurar projeto Supabase (env vars; `.env.example` atualizado).
2. Escrever migrations + políticas RLS; aplicar e conferir no dashboard.
3. Modelar schema Drizzle e conectar.
4. Implementar telas e actions de auth (RHF+Zod; erros genéricos).
5. Google OAuth via Supabase.
6. Onboarding (perfil → organização → contexto) com `onboarding_completed_at`.
7. Redirecionamentos: sem sessão → login; sem onboarding → onboarding; autenticado em `(auth)` → dashboard (placeholder).
8. Resolver ADR pendente #4 (convites de organização no MVP).

## Critérios de aceite

- [ ] Cadastro, login, logout, reset e Google login funcionando
- [ ] RLS impede acesso entre organizações (verificado com dois usuários de teste)
- [ ] Onboarding obrigatório cria organização e marca conclusão
- [ ] service role usada só server-side (`server-only`)
- [ ] Formulários validados com Zod dos dois lados

## Testes necessários

Schemas de validação (auth/onboarding); helper de autorização/membership (unit).

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + teste manual dos fluxos com 2 contas.

## Fora do escopo

Dashboard real (Fase 5), shell definitivo (Fase 4), qualquer feature de prospecção.

## Riscos

Políticas RLS incorretas = vazamento entre orgs (testar cedo com 2 usuários); fluxo de cookies do `@supabase/ssr` mal configurado causa sessões instáveis.

## Checklist de conclusão

- [ ] Critérios verificados com 2 contas reais de teste
- [ ] ADR #4 registrado
- [ ] `.env.example` atualizado
- [ ] Aprovação antes da Fase 04
