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

- Cabeçalho: nome, logo, ações primárias discretas e menu de ações secundárias.
- Metadados: frescor dos dados, endereço, telefone e site.
- Tabs persistentes por URL:
  - **Visão geral**: resumo da oportunidade, diagnóstico da presença digital, sinais de segmento e botão opcional para baixar PDF.
  - **Métricas**: score, nível, confiança, `reasons`, serviços sugeridos e maturidade digital por eixo.
  - **Abordagem IA**: resumo comercial, WhatsApp e e-mail (`13-ai-groq.md`).
- **Presença digital**: site, resultado da auditoria, sinais sociais/segmento quando detectados e estados inconclusivos sem virar problema confirmado.
- Cards de "Presença digital", "Resumo da oportunidade", "Potencial da oportunidade", "Maturidade digital" e "Briefing IA" são colapsáveis, com preferência lembrada por tipo de card entre visitas (`specs/phases/phase-23-pipeline-detail-and-card-ux.md`).
- Ações: favoritar, adicionar/ver no pipeline, atualizar dados, reanalisar e baixar diagnóstico.
- Se a empresa é lead: link para o card no pipeline.

## Favoritos (`/favorites`)

- Mesma tabela reutilizada, filtrada por `favorites` da organização.
- Favoritar/desfavoritar: mutação com optimistic update (coração `pi`); disponível na tabela, no detalhe e em lote.

## Exportação CSV

- Exporta a visão filtrada atual ou a seleção; geração server-side (Route Handler), escapando células corretamente (proteção contra CSV injection — `17-security.md`).
- Colunas: dados da empresa + score + status de site. Registra atividade `export_created`.

## Pesquisas salvas (`/searches`)

- Lista de `searches` com status, cidade/segmento, total e data; reabrir resultados; repetir pesquisa (respeitando cache de `08-business-discovery.md`).
