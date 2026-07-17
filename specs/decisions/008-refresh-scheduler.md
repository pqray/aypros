# 008 - Agendamento do refresh de dados

- **Data**: 2026-07-17
- **Status**: aceita

## Contexto

A Fase 12 precisa manter empresas ativas frescas sem introduzir Redis, worker dedicado ou uma fila externa antes do MVP. O volume inicial esperado e o cap diário de Place Details permitem processamento pequeno e serial.

## Decisão

Usar scheduler in-process no `apps/api`, com `setInterval`, tick horário, batch pequeno, processamento serial e estado de retomada no banco (`businesses.refreshed_at`, `provider_status` e últimas auditorias). O scheduler e desligado por `REFRESH_ENABLED=false` e não roda em testes.

## Alternativas consideradas

- BullMQ/Redis - mais robusto para retry/concorrencia, mas aumenta infraestrutura e operação antes do MVP.
- Cron externo chamando endpoint interno - simples, mas ainda exige configuração de deploy e proteção adicional de endpoint.

## Consequencias

O MVP fica simples e barato, mas depende de pelo menos uma instancia da API viva para executar ticks. Migrar para BullMQ/worker dedicado passa a ser obrigatorio quando houver multiplas instancias, backlog alto, necessidade de retries granulares ou observabilidade operacional mais forte.
