# 013 — Trigger de criação de cliente AYhub ao entrar em "won"

- **Data**: 2026-07-20
- **Status**: aceita

## Contexto

Quando um lead da pipeline vira "ganho", o AYhub precisa criar (ou localizar) o cliente
correspondente automaticamente. Era preciso escolher onde esse gatilho vive: hook síncrono na
rota que já atualiza o lead, trigger de banco (Postgres), ou job assíncrono.

## Decisão

Hook síncrono dentro do handler `PATCH /v1/leads/:id` (`apps/api/src/leads.ts`): depois de
persistir a mudança de `status` para `"won"`, chama `findOrCreateAyhubClient` em `try/catch` —
falha aqui loga erro mas não derruba a resposta do PATCH (fluxo complementar, não obrigatório).

## Alternativas consideradas

- Trigger de banco (Postgres) na tabela `leads` reagindo a `UPDATE`: roda fora do código
  TypeScript, mais difícil de testar/depurar, e sem precedente no projeto (schema até então só
  `public`, sem trigger cross-schema).
- Job assíncrono (fila): exigiria montar infraestrutura de fila/worker inexistente no projeto
  hoje — sobre-engenharia para uma operação rápida (criar uma linha em `ayhub.clients`).

## Consequências

Positivo: lógica de negócio inteira em TypeScript, testável, sem infraestrutura nova. Negativo:
acopla (levemente) o módulo de pipeline ao AYhub via import direto de `ayhub-service.ts` — aceito
porque o acoplamento é unidirecional e a falha é isolada (try/catch nunca propaga).
