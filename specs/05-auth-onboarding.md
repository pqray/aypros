# 05 — Autenticação e Onboarding

Supabase Auth. Sessão via cookies com `@supabase/ssr` (server-side). Formulários com React Hook Form + Zod (`packages/validation`).

## Fluxos de autenticação

| Fluxo | Detalhes |
|---|---|
| Cadastro | e-mail + senha; confirmação de e-mail conforme config do Supabase; cria `profiles` via trigger ou no primeiro login |
| Login | e-mail + senha; erros genéricos (não revelar se e-mail existe) |
| Google login | OAuth via Supabase; mesmo pós-login do cadastro |
| Senha | recuperação por e-mail (reset flow do Supabase); troca de senha na página de perfil |
| Logout | server action; invalida sessão e redireciona para login |

Regras de senha: mínimo 8 caracteres; validação Zod espelhada no cliente e servidor.

## Sessão e proteção de rotas

- Grupos de rota: `(auth)` público (login, cadastro, reset) e `(app)` protegido.
- Middleware do Next atualiza/renova sessão; layout server-side do grupo `(app)` verifica usuário e redireciona para `/login` se ausente.
- Usuário autenticado sem onboarding completo → redirecionado para `/onboarding`.
- Usuário autenticado acessando `(auth)` → redirecionado para o dashboard.

## Onboarding

Wizard curto (2–3 passos), obrigatório após primeiro login:

1. **Perfil**: nome completo (avatar opcional via Supabase Storage).
2. **Organização**: criar nova (nome → slug gerado) — ingresso em organização existente ocorre por convite (pós-MVP: link de convite; MVP: membro é adicionado pelo owner via e-mail já cadastrado, decisão pendente registrada no README de decisões).
3. **Contexto de uso** (opcional): tipo de profissional — apenas para personalização futura.

Ao concluir: `profiles.onboarding_completed_at` preenchido; usuário vira `owner` da organização criada; redireciona ao dashboard.

## Organizações

- Todo dado de trabalho pertence a uma organização (ver `04-database.md`).
- MVP: usuário atua em uma organização ativa por vez (a organização ativa fica em cookie/claim; seletor no shell se houver várias).
- Papéis: `owner` (gerencia org e membros), `admin` (gerencia dados), `member` (usa o produto). Autorização detalhada em `17-security.md`.

## Perfil

Página de configurações: editar nome, avatar, trocar senha, ver e-mail, escolher tema. Dados iniciais via Server Component; mutações via Server Actions.
