# 12 — Pipeline (CRM leve)

Kanban de leads por organização. Tabelas `leads`, `notes`, `activities` (`04-database.md`).

## Estágios (fixos no MVP — enum `lead_stage`)

`new → contacted → in_conversation → proposal_sent → won | lost`

Rótulos na UI em pt-BR: Novo, Contactado, Em conversa, Proposta enviada, Ganho, Perdido. Estágios customizáveis são pós-MVP.

## Kanban (`/pipeline`)

- Colunas por estágio com contagem e soma de `potential_value`.
- Cards: nome da empresa, score (badge), próxima ação + data (destaque se vencida), valor potencial.
- **Drag and drop** entre colunas e reordenação dentro da coluna (campo `position`); implementação com biblioteca leve de DnD compatível com React (decisão na Fase 9 via ADR) e animação Motion.
- **Optimistic update** no drop: UI move imediatamente, rollback com toast (Sonner) em erro (`14-data-fetching-state.md`).
- Mover para `won`/`lost` atualiza `lead_status` e pede confirmação leve (dialog) com registro de atividade.
- O card não deve ter menu de três pontos para "Mover para..."; estágio e status são editados no detalhe do lead, e o drag/drop cobre a movimentação rápida.
- Mobile: colunas com scroll horizontal; ações críticas ficam no detalhe do lead. DnD não deve ser o único caminho para alterar os dados comerciais.

## Detalhe do lead (drawer sobre o Kanban ou `/pipeline/[leadId]`)

- Resumo da empresa (link para `/businesses/[id]`).
- **Progresso do estágio**: badge com o estágio atual + botão "Avançar para [próxima etapa]" (progressão linear novo → contactado → em conversa → proposta enviada → ganho) + botão "Marcar como perdido" (alcançável de qualquer estágio não-terminal). Sem stepper com as 6 etapas clicáveis — decisão da fase 23, substitui o stepper da fase 22 por ficar "morto" quando clicado sem nada mudar de visível (`specs/phases/phase-23-pipeline-detail-and-card-ux.md`).
- Detalhe organizado em tabs: **Lead** (dados comerciais, estimativa de custo, registrar contato), um painel central que muda de conteúdo e rótulo conforme o estágio atual (Abordagem/Acompanhamento/Copiloto/Cliente/Motivo — `specs/phases/phase-22-pipeline-stage-panels.md`) e **Notas**. Atividades fica num painel lateral (Sheet) acessível por botão, não é uma tab.
- Campos editáveis: estágio, status comercial, valor potencial, próxima ação (`next_action` + `next_action_at`) e responsável.
- Score aparece integrado a um bloco de potencial com confiança e motivos, não como tag solta no meio dos campos; card colapsável (preferência lembrada por tipo de card, `specs/phases/phase-23-pipeline-detail-and-card-ux.md`), assim como o de estimativa de custo.
- **Notas**: lista cronológica, criar/editar/excluir (autor + timestamp); RHF + Zod.
- **Atividades**: timeline automática (criado, mudança de estágio, nota criada, auditoria, IA gerada).
- Ações de IA: gerar resumo/mensagens (`13-ai-groq.md`).
- Ação destrutiva: "Remover do pipeline" exige confirmação; remove o lead sem apagar a empresa.

## Regras

- Um lead por empresa por organização (UNIQUE — adicionar de novo leva ao lead existente).
- Criar lead a partir de: tabela de empresas, detalhe, dashboard, ações em lote. Estágio inicial `new`.
- Toda mudança de estágio gera `activities.lead_stage_changed` com de/para.
- Remover lead registra `lead_archived`; notas podem ser removidas em cascata e atividades preservam histórico quando aplicável.
