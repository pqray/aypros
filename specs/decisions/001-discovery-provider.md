# 001 — Provider de descoberta: Google Places API

- **Data**: 2026-07-15
- **Status**: aceita

## Contexto

A descoberta de empresas (`specs/08-business-discovery.md`) exige um provider externo com boa cobertura de negócios locais no Brasil. As decisões pendentes listavam Google Places (New), Foursquare e Serper. O usuário forneceu uma chave da Google Places API, definindo a escolha.

## Decisão

Usar **Google Places API (New)** como implementação real de `DiscoveryProvider` no MVP (Text Search para cidade+segmento; campos: nome, endereço, telefone, website, rating, contagem de avaliações, categorias, coordenadas, place_id).

## Alternativas consideradas

- **Foursquare Places** — cobertura de negócios locais no Brasil inferior à do Google; dados de website/telefone menos completos.
- **Serper/SerpAPI** — scraping de SERP, dados menos estruturados e termos mais frágeis.

## Consequências

- Melhor qualidade de dados no Brasil; custo por requisição exige os limites e o cache de pesquisa da spec 08 desde o início.
- **Termos do Google**: place data tem restrições de cache/retenção (place_id pode ser armazenado indefinidamente; demais campos têm limites) — a implementação na Fase 06 deve revisar os termos vigentes e ajustar a retenção de `businesses.raw` se necessário.
- A interface `DiscoveryProvider` permanece agnóstica; trocar de provider depois não afeta o restante do código.
- A chave deve ser **restringida à Places API** no Google Cloud Console (sem restrição de referrer, pois o uso é server-side — restringir por IP quando houver deploy).
