# 20 — Refresh automático de dados

Manter frescos os dados de empresas que a organização **realmente usa**, sem explodir custo de provider. Complementa `08-business-discovery.md` (normalização/dedup) e `09-website-http-audit.md` (auditoria); processos assíncronos seguem `02-architecture.md`.

## Por que existe

1. **Qualidade**: rating, contagem de avaliações, telefone e site mudam; score e mensagens de IA baseados em dado velho geram abordagem errada.
2. **Conformidade**: a política do Google Places permite armazenar o `place_id` indefinidamente, mas dados de detalhes (rating, telefone, site etc.) têm janela de cache limitada (30 dias). Empresas ativas precisam de re-busca periódica; empresas nunca usadas não devem ser re-buscadas (custo sem benefício).

## O que fica velho e o alvo de frescor

| Dado | Fonte | Custo | Alvo de frescor (empresas ativas) |
|---|---|---|---|
| Dados da empresa (rating, reviews, telefone, site, endereço) | Google Places (Place Details por `place_id`) | pago | ≤ 30 dias |
| Auditoria HTTP do site | nossa (`packages/integrations/audit`) | grátis | ≤ 7 dias |
| Score de oportunidade | `packages/scoring` (puro) | grátis | recalculado após qualquer refresh acima |

**Empresa ativa** = favoritada por alguma org **ou** com lead de status `active` em algum pipeline. Todo o resto (resultados de pesquisa nunca tocados) **não** entra no refresh automático — só volta a ser atualizado se aparecer numa pesquisa nova (dedup de `08` já faz upsert) ou por refresh manual.

## Mecanismo (MVP)

- **Scheduler in-process no `apps/api`**: tick horário que seleciona candidatos por staleness e processa **serialmente** em batch pequeno. Sem Redis/fila externa no MVP — BullMQ/worker dedicado é item do `18-roadmap.md` (a decisão do mecanismo vira ADR na implementação).
- Seleção por SQL: empresas ativas com `refreshed_at` (novo campo em `businesses`) além do alvo, ordenadas pela mais velha; auditorias idem via última `website_audits.created_at`.
- **Idempotente e retomável**: cada empresa é uma unidade de trabalho independente; falha em uma não derruba o batch; o tick seguinte continua de onde parou (estado no banco, nunca em memória).
- **On-demand**: botão "Atualizar dados" no detalhe da empresa dispara o mesmo fluxo para uma empresa (respeitando os limites), com feedback de "atualizado há X".

## Controle de custo (inegociável)

- Caps em `packages/config` (`refreshConfig`): máx. de Place Details por dia (default conservador, ex.: 30/dia), tamanho de batch por tick, alvo de frescor por tipo.
- Contagem de chamadas do dia persistida (contável por `refreshed_at`/log de refresh) — cap atingido, refresh de Places para até o dia seguinte; auditorias (grátis) continuam.
- Refresh de Places usa **Place Details com field mask mínima** (mesmos campos do discovery) — nunca Text Search.
- Cap diário esgotável ≠ erro: é estado normal, logado como info.

## Regras de escrita

- Reusar a normalização de `08` (telefone E.164, website, `social_only`) — mesma função, nunca duplicar.
- **Nunca degradar dado**: resposta vazia/erro do provider mantém o valor atual e registra o erro; `NOT_FOUND` definitivo (place removido) marca a empresa (`provider_status`) em vez de apagar.
- Após refresh de dados ou auditoria, recalcular e inserir novo `opportunity_scores` (histórico preservado, como já é hoje).
- Escritas via service role (RLS bloqueia cliente em `businesses`), como no restante do backend.

## UI

- Detalhe da empresa: "Dados atualizados há X dias" + botão de refresh manual.
- Nenhuma tela nova; refresh automático é invisível exceto pelo frescor dos dados.

## Observabilidade

Log estruturado por tick: candidatos, processados, falhas, chamadas de provider gastas. Sem tabela dedicada no MVP.
