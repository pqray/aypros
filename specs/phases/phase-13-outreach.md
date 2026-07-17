# Fase 13 — Rotina de abordagem

## Objetivo

Fechar o ciclo "gerar → enviar → registrar → acompanhar": registro de contato por canal, link direto do WhatsApp com a mensagem da IA pré-preenchida, e visão "Hoje" no dashboard com as próximas ações do dia/vencidas.

## Specs-base para leitura

`00-project-rules.md`, `12-pipeline-crm.md` (atividades, próxima ação), `13-ai-groq.md` (rascunhos — envio automático segue proibido), `07-dashboard.md`, `14-data-fetching-state.md` (mutações otimistas), `04-database.md` (consulta: `activities`, `leads`).

## Dependências (instalar nesta fase)

Nenhuma nova.

## Arquivos esperados

- Migration: valor novo `lead_contacted` no enum `activity_type`; coluna `leads.last_contact_at`.
- `apps/api/src/leads.ts`: `POST /v1/leads/:id/contacts` (canal `whatsapp | email | phone | other`, nota opcional) — grava atividade + atualiza `last_contact_at`; `last_contact_at` incluído no `GET /v1/pipeline` e no detalhe.
- Web `features/ai`: botão "Marcar como enviada" no rascunho (registra contato com o canal do kind); botão "Abrir no WhatsApp" via `wa.me/<E.164>?text=<rascunho>` quando a empresa tem telefone — **abre o app, nunca envia sozinho**.
- Web `features/pipeline`: "último contato há X" no card do Kanban e no detalhe; ação "Registrar contato" manual; destaque para leads sem contato há mais de N dias (config).
- Web `features/dashboard`: bloco "Hoje" — próximas ações de hoje e vencidas, com link pro lead.

## Tarefas

1. Migration (enum + coluna) com aprovação do usuário.
2. Endpoint de contato + contratos (`packages/types`, `packages/validation`) + label/ícone da atividade nova.
3. Botões no card de IA (marcar como enviada / abrir WhatsApp com texto) — telefone precisa existir e ser E.164; sem telefone, botão não aparece.
4. Kanban/detalhe com último contato + registro manual + destaque de "esfriando".
5. Bloco "Hoje" no dashboard (RPC ou endpoint agregando `next_action_at <= hoje` de leads ativos).
6. Timeline do lead exibindo contatos com canal.

## Critérios de aceite

- [ ] Registrar contato atualiza atividade, `last_contact_at`, Kanban e timeline (otimista com rollback)
- [ ] `wa.me` abre com o texto do rascunho **editado** (o que está na tela, não o original gerado)
- [ ] Nenhum envio automático de mensagem em nenhum fluxo
- [ ] Bloco "Hoje" vazio tem empty state honesto; vencidas destacadas como no detalhe do lead
- [ ] Lead sem contato há mais de N dias visualmente distinguível no Kanban

## Testes necessários

P1: montagem da URL `wa.me` (E.164, encoding do texto, ausência de telefone); agregação do bloco "Hoje" (unit com datas de tabela). P2: card de IA com os botões novos; card do Kanban com último contato.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + fluxo manual: gerar mensagem → abrir WhatsApp → marcar como enviada → ver Kanban/timeline/dashboard refletirem.

## Fora do escopo

Envio real de e-mail/WhatsApp API, sequências de follow-up, lembretes por notificação — `18-roadmap.md` (Outbound).

## Riscos

Duplo registro (marcar enviada duas vezes) — aceitável no MVP, timeline mostra ambos; texto longo demais na URL do `wa.me` — truncar com aviso.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Fluxo manual executado e reportado
- [ ] Aprovação explícita antes da Fase 14
