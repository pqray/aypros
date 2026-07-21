# 014 — Nomenclatura em português no schema `ayhub`

- **Data**: 2026-07-20
- **Status**: substituída por [015](015-ayhub-english-naming.md)

## Contexto

`00-project-rules.md` §3 exige inglês em tabelas/colunas de código. O pedido original do usuário
especificou, com detalhe explícito, nomes de tabela e coluna em português para todo o schema
`ayhub` (`clientes`, `nome`, `contato`, `dominio_responsavel`, `valor_manutencao`, etc.) — ao
contrário da Parte 1 (estimador de custo em `leads`), onde o pedido usava nomes em português só
como exemplo (prefixado "ex:") e a implementação seguiu o inglês já estabelecido na tabela.

## Decisão

Manter os nomes em português no schema `ayhub`, exatamente como especificado — é uma exceção
registrada à regra geral, não uma mudança da regra. Schemas futuros continuam em inglês por
padrão, salvo novo ADR explícito.

## Alternativas consideradas

- Traduzir para inglês (`clients`, `sites`, `name`, `contact`, `domain_owner`, `maintenance_fee`):
  seguiria a regra geral do projeto, mas exigiria uma migration de rename em produção (o schema
  já foi aplicado ao banco real antes desta decisão ser formalizada) e divergiria do vocabulário
  literal que o usuário definiu para este módulo especificamente.

## Consequências

Positivo: nomenclatura do banco espelha exatamente a linguagem de negócio do módulo (clientes,
manutenção, domínio) tal como especificada. Negativo: o schema `ayhub` fica inconsistente com o
resto do banco (`public`, todo em inglês) — quem ler o código precisa saber que essa é uma
exceção deliberada, não um erro. Sem migração corretiva planejada; se o time crescer e isso virar
fricção real, revisitar com um ADR novo (não editar este).
