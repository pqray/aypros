# Fase 18 - Briefing IA da empresa

Status: implementada em codigo. Validacao manual pendente.

## Objetivo

Criar um briefing consultivo gerado por IA para cada empresa, usando os dados ja coletados pelo Aypros. O briefing traduz auditoria, score, presenca digital, pipeline e recomendacoes em uma leitura comercial clara para o vendedor, sem depender apenas de cards tecnicos ou texto fixo no frontend.

O resultado fica salvo e reutilizavel em empresa, lead, PDF e geracoes de abordagem.

## Specs-base

`00-project-rules.md`, `03-design-system.md`, `10-opportunity-scoring.md`, `11-businesses-and-favorites.md`, `12-pipeline-crm.md`, `13-ai-groq.md`, `14-data-fetching-state.md`, `16-testing.md`, `17-security.md`, `19-backend-api.md`.

## Implementado

- Tabela `business_ai_briefings` com historico por empresa, organizacao e `kind`.
- `source_hash` para identificar quando os dados-base mudaram.
- API `GET /v1/businesses/:businessId/briefing`.
- API `POST /v1/businesses/:businessId/briefing`.
- Provider Groq especifico para briefing, com prompt versionado `business-briefing-v2`.
- Schema JSON validado para `context`, `digitalPresence`, `opportunities`, `risks`, `salesAngle`, `recommendedOffer`, `nextStep` e `confidenceNotes`.
- Input de IA reunindo empresa, auditoria, score, relatorio atual, pipeline/notas quando existir, organizacao e vendedor.
- Card `BusinessAiBriefingCard` na aba Visao geral da empresa.
- Empty state com CTA, skeleton, estado gerado, badge de dados atualizados e toast de erro/sucesso.
- Hooks TanStack Query com cache e invalidacao quando auditoria/dados da empresa sao atualizados.

## Regras do prompt

- Usar somente fatos presentes no JSON de entrada.
- Separar fatos detectados de hipoteses comerciais.
- Nao inventar Instagram, seguidores, posts, engajamento, trafego, premios, anos de mercado ou problemas nao listados.
- Citar Instagram, Linktree, iFood, delivery, WhatsApp ou redes sociais apenas quando houver sinal salvo/detectado.
- Quando nao houver evidencia social, informar que nao ha evidencia salva de canal social proprio.
- Nao falar de cardapio para segmento que nao seja `restaurant` ou `food_service`.
- Achados `inconclusive` ou `unknown` nao podem ser afirmados como problema.
- Evitar texto generico como "melhorar presenca online" sem conectar a um achado real e ao impacto comercial.
- Preparar a narrativa da abordagem: Rayssa desenvolveu uma plataforma para mapear empresas na internet, e esta empresa apareceu na busca por causa de sinais reais encontrados.

## Contrato

```json
{
  "context": "",
  "digitalPresence": "",
  "opportunities": [],
  "risks": [],
  "salesAngle": "",
  "recommendedOffer": "",
  "nextStep": "",
  "confidenceNotes": []
}
```

## Arquivos principais

- `supabase/migrations/20260717210000_phase_18_business_ai_briefings.sql`
- `packages/database/src/schema.ts`
- `packages/types/src/index.ts`
- `packages/integrations/src/ai/types.ts`
- `packages/integrations/src/ai/schemas.ts`
- `packages/integrations/src/ai/prompts.ts`
- `packages/integrations/src/ai/groq.ts`
- `apps/api/src/business-briefings.ts`
- `apps/api/src/app.ts`
- `apps/web/src/features/businesses/api.ts`
- `apps/web/src/features/businesses/queries.ts`
- `apps/web/src/features/businesses/components/business-ai-briefing-card.tsx`
- `apps/web/src/features/businesses/components/business-detail-view.tsx`

## Criterios de aceite

- [x] Usuario consegue gerar briefing IA para uma empresa.
- [x] Briefing gerado e salvo aparece ao reabrir a empresa sem nova chamada IA.
- [x] Botao `Atualizar briefing` forca nova geracao.
- [x] Briefing usa dados reais do relatorio/score/auditoria.
- [x] Nao menciona cardapio fora de restaurante/alimentacao.
- [x] Nao inventa Instagram, seguidores, posts ou engajamento.
- [x] Quando nao ha evidencia social, informa a ausencia de evidencia salva.
- [x] UI fica escaneavel e nao vira bloco gigante de texto.
- [x] Erros de IA/API aparecem em toast.
- [x] Autorizacao respeita organizacao.

## Testes automatizados

- [x] Prompt de briefing exige JSON estruturado e regras anti-alucinacao.
- [x] Provider Groq valida output e tenta correcao uma vez quando o JSON vem invalido.
- [x] API retorna estado vazio com `sourceHash`.
- [x] API gera briefing e persiste `content_json`, `summary`, `prompt_version` e `source_hash`.
- [x] Frontend renderiza CTA do briefing na Visao geral.

## Comandos de validacao

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Checklist de conclusao

- [x] Migration criada.
- [x] Migration aplicada localmente.
- [x] API GET/POST implementada.
- [x] Prompt/schema versionado criado.
- [x] Frontend com card de briefing na Visao geral.
- [x] Testes automatizados adicionados.
- [ ] Fluxo manual validado.

## Fluxo manual pendente

1. Abrir uma empresa sem briefing e gerar.
2. Reabrir a empresa e confirmar que o briefing foi reaproveitado.
3. Atualizar briefing manualmente.
4. Testar empresa de alimentacao com sinais de delivery/menu.
5. Testar empresa de servicos para confirmar que nao aparece cardapio.
6. Testar empresa sem Instagram detectado para confirmar que a IA nao inventa rede social.

## Fora do escopo

- Scraping direto de Instagram.
- Metricas reais de seguidores/posts/engajamento sem provider externo pago.
- Envio automatico de e-mail/WhatsApp.
- Briefing multiagente em background com fila dedicada.
- Agendamento automatico de regeneracao.
