# Fase 15 — Auditoria por segmento

## Objetivo

Detectar sinais específicos do segmento da empresa a partir dos dados que já temos (URL do site + HTML auditado + categorias do Places) — ex.: restaurante que "vive" no iFood/Linktree sem cardápio próprio — e usar isso no score e nas mensagens de IA. **Sem scraping de Instagram** (sem API pública para perfis de terceiros; termos proíbem).

## Specs-base para leitura

`00-project-rules.md`, `09-website-http-audit.md` (detecções/evidências), `10-opportunity-scoring.md` (versionamento do algoritmo — mudança de peso exige versão nova + ADR), `13-ai-groq.md` (input estruturado), `08-business-discovery.md` (categorias, `social_only`).

## Dependências (instalar nesta fase)

Nenhuma nova.

## Arquivos esperados

- `packages/integrations/audit`: detectores de plataforma por URL/HTML — `link_in_bio` (Linktree, lnk.bio, beacons), `delivery_platform` (iFood, Goomer, Anota.aí, Cardápio Web, Menu Dino), `menu_online` (link/página de cardápio no site), com evidência registrada como as detecções atuais.
- Mapeamento categoria do Places → segmento interno (`restaurant | food_service | services | retail | other`) em `packages/integrations` ou `packages/config`.
- `packages/scoring`: **algorithm v2** (ADR obrigatório) — novos motivos: "atende só por link-in-bio", "depende de plataforma de delivery sem site próprio", "sem cardápio online" (só para segmentos de comida); pesos revisados com casos de tabela.
- IA: novos fatos no `AiInput` (plataformas detectadas, segmento) — prompts continuam v1 se só o input muda; bump de versão se o texto do prompt mudar.
- Web: badges das detecções novas no detalhe da empresa e chips na tabela/cards.

## Tarefas

1. Tabela de plataformas (domínios/padrões de URL e assinaturas de HTML) com fixtures reais.
2. Detectores puros + testes com fixtures (P0, mesmo padrão do parser atual).
3. Mapeamento categoria→segmento com testes.
4. ADR de scoring v2 + implementação + casos de tabela atualizados (contrato do algoritmo).
5. Persistência: novas chaves em `website_audits.detections` (jsonb — sem migration de schema) e `businesses.raw` para o segmento.
6. Input da IA enriquecido + validação manual de 2–3 gerações (o texto deve citar o fato novo sem inventar).
7. UI: badges/chips + textos das detecções no detalhe.

## Critérios de aceite

- [ ] Restaurante com site = iFood/Linktree é detectado com evidência (URL/trecho), nunca por palpite
- [ ] Detecções de segmento só disparam para o segmento certo (sem "sem cardápio" em dentista)
- [ ] Score v2 versionado com ADR; scores antigos preservados com `algorithm_version` anterior
- [ ] Mensagens de IA usam o sinal novo quando presente e continuam sem inventar fatos
- [ ] Zero chamadas novas de provider ou scraping — só dados já coletados

## Testes necessários

P0: detectores por fixture (positivo/negativo/borda por plataforma); scoring v2 (casos de tabela completos). P1: mapeamento categoria→segmento; montagem do `AiInput` com os campos novos.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + auditar 3–5 restaurantes reais de uma pesquisa e conferir detecções/score/mensagens.

## Fora do escopo

Métricas reais de Instagram (seguidores, posts) — exigiria serviço pago/frágil, fica em `18-roadmap.md`; screenshots; comparação com concorrentes.

## Riscos

Falso positivo de plataforma (site próprio hospedado em domínio de builder) — mitigar exigindo evidência forte e estado `inconclusive` na dúvida; drift da tabela de plataformas — manter em um único arquivo fácil de estender.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Detecções e gerações validadas pelo usuário em empresas reais
- [ ] Aprovação explícita antes da próxima fase
