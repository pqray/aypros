# Fase 22 — Painel de estágio no lead + motivo de perda

## Objetivo

Substituir a aba fixa "Abordagem com IA" (igual em qualquer estágio) por um painel que muda de
acordo com o estágio atual do lead, e capturar o motivo quando um lead é marcado como perdido.

## Specs-base para leitura

`00-project-rules.md`, `12-pipeline-crm.md` (atualizar com o painel por estágio), `13-ai-groq.md`
(o Copiloto de contato da fase 19 é o painel de "Em conversa"/"Proposta enviada" — depende da
fase 19 estar implementada primeiro), `14-data-fetching-state.md`, `17-security.md`,
`19-backend-api.md`.

## Dependências (instalar nesta fase)

Nenhuma nova.

## Arquivos esperados

- `packages/database/src/schema.ts`: `leads.lost_reason` (text, nullable).
- Migration: `alter table leads add column lost_reason`; `get_pipeline_leads` recriada com a
  coluna nova (mesmo padrão de drop+recreate já usado nas fases 20/21, já que muda o tipo de
  retorno).
- `packages/types`: `LeadSummary.lostReason`, `UpdateLeadInput.lostReason`,
  `LeadDetailResponse.ayhubClientId` (nullable — resolvido no backend, não é coluna de `leads`).
- `packages/validation`: `updateLeadSchema` ganha `lostReason`.
- `apps/api/src/leads.ts`: `LEAD_FIELDS`/`toLeadSummary`/`pipelineRowSchema` incluem
  `lost_reason`; `PATCH /v1/leads/:id` persiste `lostReason` quando enviado; `GET
  /v1/leads/:id` resolve `ayhubClientId` com uma consulta leve em `ayhub.clients` por
  `origin_lead_id` (usa `ctx.supabase`, então RLS garante que só owner/admin enxerga o vínculo).
- `apps/web/src/features/pipeline/components/lead-detail-view.tsx`: aba do meio troca de rótulo
  e conteúdo conforme `lead.stage`; fluxo de mover pra "Perdido" passa a exigir motivo.
- `apps/web/src/features/pipeline/components/lost-reason-dialog.tsx` (novo): substitui o
  `ConfirmDialog` genérico só para o destino "lost" — textarea obrigatória.
- `apps/web/src/features/pipeline/components/follow-up-panel.tsx` (novo): painel do estágio
  "Contactado".
- `apps/web/src/features/pipeline/components/won-panel.tsx` (novo): painel do estágio "Ganho",
  link pro cliente no AYhub quando `ayhubClientId` existir.
- `apps/web/src/features/pipeline/components/lost-reason-panel.tsx` (novo): painel do estágio
  "Perdido", mostra o motivo registrado.
- Testes dos componentes novos e do backend (`lost_reason`, resolução de `ayhubClientId`).

## Tarefas

1. Migration: `leads.lost_reason` + `get_pipeline_leads` atualizada.
2. Tipos/validação/API: `lostReason` de ponta a ponta; `ayhubClientId` resolvido em `GET
   /v1/leads/:id`.
3. `LostReasonDialog`: abre no lugar do `ConfirmDialog` quando o destino do stepper/drag é
   "lost"; exige texto não vazio; salva `stage` e `lostReason` numa única chamada de
   `PATCH`. O destino "won" continua usando o `ConfirmDialog` simples de hoje.
4. Painel por estágio no `LeadDetailView` (a aba do meio, que hoje é sempre "Abordagem com IA"):
   - `new` → `AiGenerationsCard` (sem mudança).
   - `contacted` → `FollowUpPanel` (tempo desde `lastContactAt`, atalho pra gerar nova mensagem
     reaproveitando `AiGenerationsCard` dentro do painel).
   - `in_conversation` / `proposal_sent` → `ContactCopilotCard` (fase 19).
   - `won` → `WonPanel` (link `/ayhub/[clientId]` quando `ayhubClientId` existir; texto
     explicando que ainda não foi criado, caso contrário).
   - `lost` → `LostReasonPanel` (mostra `lead.lostReason`).
5. Rótulo da aba muda junto (`"Abordagem"`, `"Acompanhamento"`, `"Copiloto"`, `"Cliente"`,
   `"Motivo"`).

## Critérios de aceite

- [ ] Mover um lead pra "Perdido" (stepper ou drag) exige motivo não vazio antes de confirmar;
      motivo persiste e aparece no painel do estágio.
- [ ] Lead em "Novo" mostra o painel de abordagem, igual ao comportamento atual.
- [ ] Lead em "Contactado" mostra o painel de acompanhamento.
- [ ] Lead em "Em conversa" ou "Proposta enviada" mostra o Copiloto de contato.
- [ ] Lead "Ganho" mostra o link pro cliente no AYhub quando ele existir, e um texto neutro
      quando não existir (nunca erro).
- [ ] Trocar de estágio atualiza o painel imediatamente, sem reload.
- [ ] Membro sem acesso ao AYhub nunca vê erro no painel de "Ganho" — o link some silenciosamente
      (RLS retorna vazio, não 403).

## Testes necessários

P0: `LostReasonDialog` bloqueia confirmação sem motivo; resolução de `ayhubClientId` respeita RLS
(owner/admin vê, member não). P1: `PATCH /v1/leads/:id` persiste `lostReason`; `get_pipeline_leads`
retorna a coluna nova sem quebrar o board. P2: troca de painel por estágio no `LeadDetailView`.

**Pendência conhecida (2026-07-20)**: só `LostReasonDialog` tem teste automatizado dedicado
(`lost-reason-dialog.test.tsx`, 4 testes — bloqueio sem motivo, trim, cancelar, reset ao reabrir).
A resolução de `ayhubClientId` via RLS, a persistência de `lostReason` no `PATCH` e a troca de
painel por estágio no `LeadDetailView` seguem cobertas só pela suíte de regressão existente, sem
teste dedicado ao comportamento novo — ver checklist de conclusão abaixo.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + verificação manual: mover um lead por
todos os 6 estágios e conferir o painel de cada um, incluindo o caso "Ganho" com e sem cliente
AYhub correspondente.

## Fora do escopo

Editar o motivo de perda depois de registrado (fica só como histórico, exibido em
`LostReasonPanel`); notificações/lembretes automáticos de follow-up no estágio "Contactado"
(`18-roadmap.md`); qualquer mudança no contrato da fase 19 além do que já está especificado lá.

## Riscos

Mais um ponto de leitura pipeline → AYhub (`ayhubClientId`), depois da escrita já existente
(fase 21). Mitigado por RLS: a consulta usa `ctx.supabase` (sessão do usuário), então um membro
sem acesso ao AYhub simplesmente não vê linha nenhuma — sem exception, sem 403 no meio da tela do
lead.

## Checklist de conclusão

- [ ] Critérios de aceite verificados.
- [ ] Testes automatizados cobrindo P0/P1.
- [ ] Fluxo validado pelo usuário nos 6 estágios.
- [ ] Aprovação explícita antes da próxima fase.
