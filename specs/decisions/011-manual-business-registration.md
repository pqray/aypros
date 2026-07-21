# 011 — Cadastro manual de empresas via provider sintético

- **Data**: 2026-07-20
- **Status**: aceita

## Contexto

A Fase 20 permite cadastrar manualmente uma empresa prospectada fora do Google Places (ex.: achada pelo Instagram). `businesses` é uma tabela global e hoje só fica visível para uma organização através de `search_results -> searches.organization_id` (`04-database.md`). É preciso decidir como um cadastro manual entra nesse circuito de visibilidade sem comprometer a query principal de listagem (`get_org_businesses_api`), que já passou por uma fase de auditoria de performance.

## Decisão

Tratar o cadastro manual como mais um provider de descoberta: `businesses.provider = 'manual'`, `provider_place_id` gerado (uuid), reaproveitando `normalizeWebsite`/`normalizePhone` de `packages/integrations/src/discovery/normalize.ts`. Quando a empresa só tem Instagram (sem site próprio), gravar exatamente como o discovery já grava um "site" que é Instagram (`socialOnly`, `socialPlatform`, `raw.websiteUri`), reaproveitando score v2, badges/ícones de presença social e IA sem mudança adicional.

Para a organização enxergar a empresa, criar uma `searches` sintética (`status = completed`, `provider = manual`, segmento/cidade preenchidos pelo formulário, `total_found = 1`) e um `search_results` de 1 item vinculando a empresa recém-criada. `get_org_businesses_api` não precisa de nenhuma alteração.

## Alternativas consideradas

- Nova coluna/tabela de vínculo direto organização↔empresa (ex.: `organization_id` em `businesses` ou tabela `manual_businesses`) — rejeitada nesta fase: exigiria RLS nova, migração na tabela mais sensível a performance do sistema, e uma segunda regra de visibilidade paralela à de `search_results`, aumentando a superfície de bugs sem necessidade real.
- Deixar `businesses` sem vínculo de organização e resolver via `favorites`/`leads` — rejeitada: uma empresa cadastrada mas ainda não favoritada/adicionada ao pipeline ficaria invisível, quebrando o objetivo da fase (ver métricas antes de decidir favoritar/prospectar).

## Consequências

O cadastro manual aparece no histórico de buscas como uma pesquisa de 1 resultado rotulada como manual — leve ruído conceitual, mas sem custo de manutenção adicional. Toda a lógica de score, auditoria, badges e IA já funciona sem mudança porque reaproveita o mesmo formato de dado do discovery. Futuras fases que mexerem em `get_org_businesses_api` ou em `search_results` precisam continuar cobrindo o caso `provider = 'manual'`.
