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
- Mobile: colunas com scroll horizontal; mover via menu do card (acessível por teclado também no desktop — DnD nunca é o único caminho).

## Detalhe do lead (drawer sobre o Kanban ou `/pipeline/[leadId]`)

- Resumo da empresa (link para `/businesses/[id]`).
- Campos editáveis: estágio, status comercial, valor potencial, próxima ação (`next_action` + `next_action_at`).
- **Notas**: lista cronológica, criar/editar/excluir (autor + timestamp); RHF + Zod.
- **Atividades**: timeline automática (criado, mudança de estágio, nota criada, auditoria, IA gerada).
- Ações de IA: gerar resumo/mensagens (`13-ai-groq.md`).

## Regras

- Um lead por empresa por organização (UNIQUE — adicionar de novo leva ao lead existente).
- Criar lead a partir de: tabela de empresas, detalhe, dashboard, ações em lote. Estágio inicial `new`.
- Toda mudança de estágio gera `activities.lead_stage_changed` com de/para.
