# 11 — Empresas e Favoritos

## Tabela de empresas (`/businesses` e resultados de pesquisa)

TanStack Table + paginação server-side (Route Handler + TanStack Query).

| Coluna | Notas |
|---|---|
| Nome | link para detalhe |
| Cidade/Segmento | — |
| Telefone | com ação copiar / link WhatsApp quando aplicável |
| Site | badge: `sem site` / `social apenas` / URL / `fora do ar` |
| Avaliação | rating + contagem |
| Score | badge com nível (tokens de oportunidade — `03-design-system.md`) |
| Ações | favoritar, adicionar ao pipeline, auditar |

- Ordenação server-side (score, avaliação, nome); estado de ordenação/página/filtros na **URL** (`14-data-fetching-state.md`).
- Filtros: com/sem site, faixa de score, faixa de avaliação, auditado ou não, já no pipeline ou não. Filtros salvos: persistir conjunto em `saved_filters` com nome; aplicar recarrega a URL.
- Seleção de linhas (checkbox) habilita **ações em lote**: favoritar, adicionar ao pipeline, auditar, exportar CSV (seleção temporária em Zustand).
- Empty states distintos: sem pesquisa ainda vs. filtros sem resultado.

## Página da empresa (`/businesses/[id]`)

- Cabeçalho: nome, endereço, telefone (ações de contato), rating, badges de site e score.
- Score: valor, nível, confiança, `reasons` e serviços sugeridos.
- **Presença digital**: site (com resultado da auditoria e evidências), redes sociais detectadas (ícones `si`).
- **Histórico de auditorias**: lista de `website_audits` com data, status e score associado; botão "Reanalisar".
- Ações: favoritar, adicionar ao pipeline, gerar resumo/mensagem com IA (`13-ai-groq.md`).
- Se a empresa é lead: link para o card no pipeline.

## Favoritos (`/favorites`)

- Mesma tabela reutilizada, filtrada por `favorites` da organização.
- Favoritar/desfavoritar: mutação com optimistic update (coração `pi`); disponível na tabela, no detalhe e em lote.

## Exportação CSV

- Exporta a visão filtrada atual ou a seleção; geração server-side (Route Handler), escapando células corretamente (proteção contra CSV injection — `17-security.md`).
- Colunas: dados da empresa + score + status de site. Registra atividade `export_created`.

## Pesquisas salvas (`/searches`)

- Lista de `searches` com status, cidade/segmento, total e data; reabrir resultados; repetir pesquisa (respeitando cache de `08-business-discovery.md`).
