# 004 - Convites de organizacao no MVP

- **Data**: 2026-07-15
- **Status**: aceita

## Contexto

A Fase 03 precisa definir como novos membros entram em uma organizacao. Link de convite exige tela publica, token expiravel, tratamento de abuso e fluxo extra de cadastro/login.

## Decisao

No MVP, membros serao adicionados pelo owner/admin usando e-mail de usuario ja cadastrado. Link de convite fica fora do MVP.

## Alternativas consideradas

- Link de convite - melhor UX para crescimento, mas aumenta superficie de seguranca e escopo da Fase 03.
- Convite por e-mail com token - semelhante ao link, com custo extra de entrega e expiracao.

## Consequencias

- Fase 03 entrega organizacoes e membership com menor risco.
- Onboarding inicial cria uma organizacao com o usuario como owner.
- Fluxo de convite publico pode ser implementado depois sem alterar o modelo base de `organization_members`.
