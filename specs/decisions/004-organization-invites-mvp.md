# 004 - Convites de organização no MVP

- **Data**: 2026-07-15
- **Status**: aceita

## Contexto

A Fase 03 precisa definir como novos membros entram em uma organização. Link de convite exige tela pública, token expirável, tratamento de abusó e fluxo extra de cadastro/login.

## Decisão

No MVP, membros serão adicionados pelo owner/admin usando e-mail de usuário já cadastrado. Link de convite fica fora do MVP.

## Alternativas consideradas

- Link de convite - melhor UX para crescimento, mas aumenta superfície de segurança e escopo da Fase 03.
- Convite por e-mail com token - semelhante ao link, com custo extra de entrega e expiração.

## Consequencias

- Fase 03 entrega organizações e membership com menor risco.
- Onboarding inicial cria uma organização com o usuário como owner.
- Fluxo de convite público pode ser implementado depois sem alterar o modelo base de `organization_members`.
