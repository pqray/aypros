# Fase 18 - Briefing IA da empresa

## Objetivo

Criar um briefing consultivo gerado por IA para cada empresa, usando os dados ja coletados pelo Aypros. O briefing deve traduzir auditoria, score, presenca digital, pipeline e recomendacoes em uma leitura comercial clara para o vendedor, sem depender apenas de cards tecnicos ou texto fixo no frontend.

O resultado deve ser salvo e reutilizavel em empresa, lead, PDF e geracoes de abordagem.

## Specs-base para leitura

`00-project-rules.md`, `03-design-system.md`, `10-opportunity-scoring.md`, `11-businesses-and-favorites.md`, `12-pipeline-crm.md`, `13-ai-groq.md`, `14-data-fetching-state.md`, `16-testing.md`, `17-security.md`, `19-backend-api.md`.

## Problema

A visao atual da empresa mistura diagnostico tecnico, motivos de score e recomendacoes. Mesmo apos melhorar a visualizacao, ainda falta uma leitura consultiva gerada especificamente para o contexto daquela empresa:

- O que essa empresa parece vender.
- Como esta a presenca digital dela hoje.
- Quais oportunidades comerciais parecem mais fortes.
- Quais riscos ou incertezas ainda existem.
- Qual abordagem comercial usar.
- Qual oferta faz mais sentido.
- Qual proximo passo sugerido.

Esse texto nao deve ser uma lista rasa de dores obvias. Ele deve funcionar como briefing de pre-venda.

## Escopo P0 - Persistencia e contrato

Criar tabela `business_ai_briefings`.

Campos esperados:

- `id`
- `organization_id`
- `business_id`
- `kind` (`commercial_briefing` no MVP)
- `content_json`
- `summary`
- `model`
- `prompt_version`
- `source_hash`
- `created_by`
- `created_at`
- `updated_at`

Regras:

- Uma empresa pode ter mais de um briefing historico, mas a UX deve ler o mais recente por `kind`.
- `source_hash` identifica se os dados-base mudaram desde a ultima geracao.
- Resultado da IA deve ser salvo; reabrir a tela nao pode chamar IA novamente.
- `organization_id` deve ser usado em autorizacao/RLS.

## Escopo P1 - Backend/API

Endpoints:

- `GET /v1/businesses/:businessId/briefing`
- `POST /v1/businesses/:businessId/briefing`
- Opcional futuro: `DELETE /v1/businesses/:businessId/briefing`

O `POST` gera ou regenera o briefing.

O input da IA deve reunir:

- Empresa: nome, cidade, estado, segmento, telefone, site, avaliacao, numero de reviews.
- Presenca digital: site proprio, social-only, plataforma social, Instagram detectado, social links, Linktree/link-in-bio, delivery, menu online quando segmento permitir.
- Auditoria: status HTTP, HTTPS, title/description, viewport, disponibilidade, performance basica, status amigavel para 401/403/429.
- Score: nota, nivel, confianca, motivos e servicos sugeridos.
- Relatorio atual: findings, recomendacoes e proximos passos.
- Pipeline quando existir: estagio, status, responsavel, ultimo contato, proxima acao.
- Notas/atividades do lead quando existir e for barato buscar.
- Organizacao/sender: nome da agencia e vendedor.

## Escopo P2 - Prompt e schema

Prompt versionado: `business-briefing-v1`.

Formato JSON esperado:

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

Regras obrigatorias:

- Nao inventar Instagram, seguidores, posts, engajamento ou canal social.
- So citar Instagram, Linktree, iFood, delivery, WhatsApp ou rede social se houver sinal salvo/detectado.
- Se nao houver evidencia, dizer que nao ha evidencia salva.
- Nao falar de cardapio para segmento que nao e restaurante/alimentacao.
- Separar fatos detectados de hipoteses comerciais.
- Evitar jargao tecnico puro; escrever para uso de vendedor.
- Evitar texto generico do tipo "falta de site" sem explicar impacto comercial.
- O briefing deve ser consultivo, objetivo e reutilizavel em abordagem.

## Escopo P3 - Frontend/UX

Criar componente `BusinessAiBriefingCard` na aba **Visao geral** de `/businesses/[id]`.

Estados:

- Sem briefing: CTA `Gerar briefing`.
- Gerando: skeleton/loader no bloco.
- Gerado: exibir briefing salvo.
- Desatualizado: indicar que os dados mudaram e oferecer `Atualizar briefing`.
- Erro: toast + estado recuperavel.

Estrutura visual:

- Resumo curto no topo.
- Secoes com icones:
  - Contexto
  - Presenca digital
  - Oportunidades
  - Riscos/incertezas
  - Angulo de abordagem
  - Oferta recomendada
  - Proximo passo
- Badges para `oportunidade`, `risco`, `proximo passo`.
- Botao `Atualizar briefing`.

Posicionamento:

- Ficar acima do diagnostico tecnico ou ao lado dele na Visao geral.
- Nao substituir score/diagnostico; o briefing interpreta esses dados.

## Escopo P4 - Reuso em outros fluxos

Depois de salvo, o briefing deve poder alimentar:

- Geracao de e-mail.
- Geracao de WhatsApp.
- PDF de diagnostico.
- Detalhe do lead.
- Aba futura "Briefing IA" no pipeline.

No MVP desta fase, basta expor o briefing na empresa e preparar o backend para ser reutilizado.

## Arquivos esperados

- `packages/database`: migration da tabela `business_ai_briefings`.
- `packages/types`: tipos do briefing e contrato de resposta.
- `packages/validation`: schemas de params/responses se necessario.
- `packages/integrations/src/ai/*`: prompt/schema `business-briefing-v1`.
- `apps/api/src/business-briefings.ts` ou rota equivalente em `businesses.ts`.
- `apps/api/src/ai.ts`: builder de input ou helper compartilhado, se fizer sentido.
- `apps/web/src/features/businesses/api.ts`: GET/POST briefing.
- `apps/web/src/features/businesses/queries.ts`: hooks TanStack Query.
- `apps/web/src/features/businesses/components/business-ai-briefing-card.tsx`.
- `apps/web/src/features/businesses/components/business-detail-view.tsx`: inserir card na Visao geral.
- Testes de API, prompt/input e componente.

## Criterios de aceite

- [ ] Usuario consegue gerar briefing IA para uma empresa.
- [ ] Briefing gerado e salvo aparece ao reabrir a empresa sem nova chamada IA.
- [ ] Botao `Atualizar briefing` força nova geracao.
- [ ] Briefing usa dados reais do relatorio/score/auditoria.
- [ ] Nao menciona cardapio fora de restaurante/alimentacao.
- [ ] Nao inventa Instagram, seguidores, posts ou engajamento.
- [ ] Quando nao ha evidencia social, informa a ausencia de evidencia salva.
- [ ] UI fica escaneavel e nao vira bloco gigante de texto.
- [ ] Erros de IA/API aparecem em toast.
- [ ] Autorizacao respeita organizacao.

## Testes necessarios

Backend:

- GET retorna ultimo briefing da empresa acessivel pela organizacao.
- POST gera briefing e persiste `content_json`, `summary`, `prompt_version`, `source_hash`.
- Acesso a empresa de outra organizacao retorna 404/403.
- Input builder nao inclui dados sociais inexistentes.
- Input builder nao dispara cardapio para `services`, `retail` ou `other`.

Prompt/schema:

- Caso com restaurante + delivery + sem menu.
- Caso com academia sem site + Instagram salvo.
- Caso com servico sem sinal social.
- Caso com site bloqueando robo HTTP 403.

Frontend:

- Empty state com CTA.
- Estado gerado renderiza secoes.
- Botao atualizar chama mutation.
- Toast de erro.

## Comandos de validacao

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

Se houver migration/API:

- Rodar migration local.
- Rebuild/restart Docker da API quando necessario.

## Fluxo manual obrigatorio

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

## Riscos

- Briefing ficar generico: mitigar com input estruturado e schema com secoes obrigatorias.
- IA inventar canais sociais: mitigar com regras fortes e testes de prompt.
- Custo de IA por abertura de tela: mitigar salvando resultado e usando GET separado.
- Dados desatualizados: mitigar com `source_hash` e estado "desatualizado".
- UX virar bloco de texto: mitigar com cards, icones, listas curtas e truncamento onde fizer sentido.

## Checklist de conclusao

- [ ] Migration criada e aplicada.
- [ ] API GET/POST implementada.
- [ ] Prompt/schema versionado criado.
- [ ] Frontend com card de briefing na Visao geral.
- [ ] Testes automatizados adicionados.
- [ ] Fluxo manual validado.
