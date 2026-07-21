# 015 — Reverter schema `ayhub` para inglês

- **Data**: 2026-07-20
- **Status**: aceita

## Contexto

[ADR 014](014-ayhub-portuguese-naming.md) registrou o schema `ayhub` em português como exceção
deliberada à regra de `00-project-rules.md` §3. Antes de qualquer uso real do módulo (projeto
ainda em desenvolvimento, sem dado real gravado), o usuário pediu para reverter e seguir a regra
geral do projeto — a exceção não valia mais a pena manter uma vez que o custo de corrigir agora
(schema vazio) é muito menor do que carregar a divergência pra frente indefinidamente.

## Decisão

Recriar o schema `ayhub` inteiro em inglês (`clients`, `sites`, `site_keys`, `site_costs`,
`content_blocks`, `payments`, com todas as colunas e valores de enum traduzidos), via
`drop schema ayhub cascade` + recreate numa migration nova (não editar a migration já aplicada
20260720140000 — ela fica como histórico do estado anterior). Todo o código que falava com esse
schema (`packages/database`, `packages/types`, `packages/validation`, rotas de `apps/api`,
`apps/web/src/features/ayhub`) foi reescrito junto, incluindo nomes de rota HTTP
(`/v1/ayhub/clientes` → `/v1/ayhub/clients`, etc.) e nomes de arquivo/componente.

## Alternativas consideradas

- Manter o português e só reforçar a documentação do ADR 014 — rejeitada porque o usuário
  explicitamente pediu a reversão, e não há custo de migração de dado real a proteger agora.
- Traduzir só os nomes de tabela/coluna no banco mas manter os tipos/campos em português no
  TypeScript — rejeitada por criar uma segunda camada de tradução inconsistente (banco em inglês,
  código em português) sem necessidade.

## Consequências

Positivo: schema `ayhub` volta a seguir `00-project-rules.md` §3 como o resto do projeto, sem
exceção documentada pra lembrar. Negativo: nenhum — schema estava vazio, sem clientes/sites/chaves
reais cadastrados, então a recriação (drop + create) não tem custo de migração de dado.
