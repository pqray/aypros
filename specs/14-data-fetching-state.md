# 14 — Data Fetching e Estado

Divisão de responsabilidades (visão geral em `02-architecture.md`).

## Server Components

Autenticação/proteção de rota, perfil, organização, dados iniciais de página e agregações do dashboard. Podem passar `initialData` para hidratar queries do cliente.

## TanStack Query (Client)

Para tudo que é interativo: pesquisas e progresso, resultados paginados, favoritos, pipeline, notas, atividades, auditorias, gerações de IA e todas as mutações.

### Query keys (padrão hierárquico, escopadas por org)

```
['org', orgId, 'searches', { page }]
['org', orgId, 'search', searchId]                 // inclui status/progresso
['org', orgId, 'businesses', { filters, sort, page }]
['org', orgId, 'business', businessId]
['org', orgId, 'business', businessId, 'audits']
['org', orgId, 'favorites', { page }]
['org', orgId, 'pipeline']
['org', orgId, 'lead', leadId]
['org', orgId, 'lead', leadId, 'notes']
['org', orgId, 'activities', { page }]
```

### Configuração

- `staleTime` padrão: 30s; listas estáveis (pesquisas antigas): 5min; progresso de processo: 0.
- **Polling**: apenas em processos com estado não-terminal (`pending`/`processing`): `refetchInterval` 2–3s, parando quando `completed | partial | failed`.
- **Invalidation** por evento: favoritar → `favorites` + `businesses`; mover lead → `pipeline` + `lead`; nota → `notes` + `activities`; auditoria concluída → `business`, `audits`, `businesses` (score).
- **Optimistic updates** (favoritar, drag no Kanban, criar nota): `onMutate` atualiza cache + snapshot, `onError` rollback + toast Sonner, `onSettled` invalida.

## URL como fonte de verdade

Cidade, segmento, filtros, página, ordenação, aba ativa e modo de visualização vivem em **search params**. Regras: links compartilháveis; reload preserva estado; componentes leem da URL (não duplicar em estado local); atualizações via router com debounce em inputs de texto.

## Zustand (somente interface)

Sidebar (colapso/drawer), command palette (aberta/fechada), seleção temporária de linhas, preferências puramente visuais. **Proibido** armazenar dados do banco no Zustand — dado de servidor pertence ao cache do TanStack Query.

## React Hook Form + Zod

Todos os formulários: autenticação, onboarding, busca, filtros, notas, configurações, pipeline. Schemas em `packages/validation`, reutilizados no servidor (mesma validação nos dois lados).
