# 010 - Scoring v2 com sinais por segmento

- **Data**: 2026-07-17
- **Status**: aceita

## Contexto

A Fase 15 adiciona sinais específicos por segmento, principalmente para negócios de alimentação: link-in-bio, dependência de delivery e ausência de cardápio online. Pela spec de scoring, mudança de pesos ou motivos exige nova versão do algoritmo e preserva scores antigos.

## Decisão

Evoluir o algoritmo para `v2`, mantendo a função pura em `packages/scoring`. O input passa a receber `raw.segment` e novos estados de auditoria (`linkInBio`, `deliveryPlatform`, `menuOnline`). Os novos motivos só disparam com evidência da auditoria; `delivery_dependency` e `no_menu_online` ficam restritos a `restaurant` e `food_service`.

## Alternativas consideradas

- Manter `v1` e apenas adicionar labels na UI - rejeitado porque novos motivos alteram score e sugestoes de servico.
- Criar coluna nova para segmento - rejeitado nesta fase; `businesses.raw` e `website_audits.detections` já cobrem a persistencia sem migration de schema.
- Aplicar "sem cardápio" para qualquer empresa - rejeitado por falsó positivo em serviços como clínicas e dentistas.

## Consequencias

Novos scores gravados passam a ter `algorithm_version = v2`; scores antigos continuam preservados no histórico com a versão anterior. O algoritmo fica mais útil para negócios de comida, mas depende da manutenção da tabela de plataformas em `packages/integrations`.
