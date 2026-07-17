# 010 - Scoring v2 com sinais por segmento

- **Data**: 2026-07-17
- **Status**: aceita

## Contexto

A Fase 15 adiciona sinais especificos por segmento, principalmente para negocios de alimentacao: link-in-bio, dependencia de delivery e ausencia de cardapio online. Pela spec de scoring, mudanca de pesos ou motivos exige nova versao do algoritmo e preserva scores antigos.

## Decisao

Evoluir o algoritmo para `v2`, mantendo a funcao pura em `packages/scoring`. O input passa a receber `raw.segment` e novos estados de auditoria (`linkInBio`, `deliveryPlatform`, `menuOnline`). Os novos motivos so disparam com evidencia da auditoria; `delivery_dependency` e `no_menu_online` ficam restritos a `restaurant` e `food_service`.

## Alternativas consideradas

- Manter `v1` e apenas adicionar labels na UI - rejeitado porque novos motivos alteram score e sugestoes de servico.
- Criar coluna nova para segmento - rejeitado nesta fase; `businesses.raw` e `website_audits.detections` ja cobrem a persistencia sem migration de schema.
- Aplicar "sem cardapio" para qualquer empresa - rejeitado por falso positivo em servicos como clinicas e dentistas.

## Consequencias

Novos scores gravados passam a ter `algorithm_version = v2`; scores antigos continuam preservados no historico com a versao anterior. O algoritmo fica mais util para negocios de comida, mas depende da manutencao da tabela de plataformas em `packages/integrations`.
