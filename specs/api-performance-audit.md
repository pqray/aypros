# Auditoria de APIs - 2026-07-17

## Escopo auditado

Rotas principais do produto:

- `GET /v1/app-context`
- `GET /v1/businesses`
- `GET /v1/searches`
- `GET /v1/searches/:id/results`
- `GET /v1/pipeline`
- `GET /v1/businesses/:id/audit-summary`
- `GET /v1/businesses/:id/report`
- `GET /v1/businesses/:id/briefing`
- Mutations de favorito, pipeline, auditoria, refresh e notas.

## Gargalos encontrados

- Contrato de paginacao inconsistente: listas retornavam `total`, mas cada tela calculava `totalPages` e estados de proxima/anterior por conta propria.
- `GET /v1/businesses/:id/briefing` reconstruia todo input de IA mesmo quando nao havia briefing salvo. Isso adicionava consultas de empresa, auditoria, score, org, perfil, lead, notas e relatorio apenas para mostrar o CTA.
- `GET /v1/businesses/:id/report` e `GET|POST /v1/businesses/:id/briefing` repetiam consultas de organizacao/perfil que ja tinham sido carregadas no contexto autenticado da requisicao.
- Resultados de discovery em andamento faziam polling na mesma frequencia do status da busca, aumentando chamadas a listas grandes durante a execucao.
- Listas com filtro textual (`name`, `city`) dependiam de `ilike '%termo%'` sem indice trigram especifico.
- Pipeline e detalhe do lead consultam por `(organization_id, stage, position)`, `(organization_id, lead_id, created_at)` e nao havia todos os indices compostos alinhados a esses acessos.
- Rotas paginadas usam `count(*) over()` nas RPCs para trazer total junto da pagina. Funciona e evita uma segunda round trip, mas ainda conta todo o conjunto filtrado; precisa ser monitorado com base real quando o volume crescer.
- Mutacao de reordenacao do pipeline ainda faz reindexacao simples da coluna. Os novos indices reduzem custo, mas uma RPC de reordenacao atomica pode ser uma proxima evolucao se o board crescer muito.

## Ajustes aplicados

- Criado contrato comum `PaginationMeta` com `page`, `pageSize`, `total`, `totalPages`, `hasNextPage` e `hasPreviousPage`.
- APIs paginadas agora retornam esse contrato:
  - `GET /v1/businesses`
  - `GET /v1/searches`
  - `GET /v1/searches/:id/results`
- Frontend passou a consumir `totalPages/hasNextPage/hasPreviousPage` do backend.
- `GET /v1/businesses/:id/briefing` ficou barato quando nao ha briefing salvo: valida acesso e busca o ultimo briefing; so calcula `sourceHash` pesado quando existe briefing para comparar staleness.
- Contexto autenticado (`requireOrgContext`) passou a expor nome da organizacao e nome do usuario para rotas internas reaproveitarem sem round trips redundantes.
- Relatorio e briefing agora reaproveitam os dados do contexto e so consultam organizacao/perfil como fallback de compatibilidade.
- Polling de discovery foi separado: status continua curto, mas a lista de resultados usa intervalo maior e para quando o estado fica terminal.
- Adicionados indices:
  - `businesses_name_trgm_idx`
  - `businesses_city_trgm_idx`
  - `businesses_segment_expr_idx`
  - `leads_org_stage_position_idx`
  - `leads_org_business_idx`
  - `notes_org_lead_created_idx`
  - `activities_org_lead_created_idx`

## Padrao esperado daqui pra frente

- Toda lista paginada deve retornar `PaginationMeta`.
- Toda tela deve usar os flags do backend para botoes de paginacao.
- Rotas de detalhe nao devem recalcular derivados pesados apenas para renderizar empty state.
- Toda rota nova que usar `ilike`, latest-row por `created_at desc`, ou timeline por `lead_id` deve ter indice correspondente.
- Endpoint que passar de 500 ms aparece como `slow api request` no log e deve ser investigado com `server-timing`.

## Pendencias para medicao real

- Rodar navegacao manual com base populada e observar logs de `slow api request`.
- Coletar tempos de:
  - `/v1/businesses` com filtros de cidade/segmento/score.
  - `/v1/searches/:id/results` com busca grande.
  - `/v1/pipeline` com muitos cards.
  - `/v1/leads/:id` com muitas atividades/notas.
- Se `count(*) over()` virar gargalo real, separar contagem em RPC dedicada ou adotar cursor/infinite loading em listas grandes.
