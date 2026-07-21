# 016 — Copiloto de contato usa provider dedicado, não o `AiKind` genérico

- **Data**: 2026-07-20
- **Status**: aceita

## Contexto

`13-ai-groq.md`/`apps/api/src/ai.ts` já tem um mecanismo genérico para gerar conteúdo com Groq:
`AiKind` (`commercial_summary`, `whatsapp_message`, `email_message`) com um `AiInput` fixo
(empresa + auditoria + score + remetente), uma rota única `POST
/v1/businesses/:businessId/ai-generations`, e `aiOutputSchemas: Record<AiKind, ZodType>`. O
Copiloto de contato (fase 19) precisa de dados que não cabem nesse `AiInput`: transcrição livre
da conversa, canal de contato e notas/atividades recentes do lead — e o resultado (`suggestedLeadPatch`,
`recommendedNextAction`) é estruturalmente diferente dos outros tipos.

## Decisão

Provider dedicado (`createGroqContactCopilotProvider`, em `packages/integrations/src/ai/groq.ts`),
com `ContactCopilotInput`/`ContactCopilotOutput` próprios e prompt/schema próprios — mesmo padrão
já usado pelo briefing consultivo (`createGroqBusinessBriefingProvider`, fase 18). Rota própria
`POST /v1/leads/:id/contact-copilot` (não passa pela rota genérica de `ai.ts`).

Diferença em relação ao briefing: persistência continua na tabela compartilhada `ai_generations`
(não ganha tabela própria como `business_ai_briefings`), porque aqui o resultado é uma análise
pontual de uma conversa (log histórico como as outras gerações), não um estado "atual" por
empresa que precisa de upsert/staleness check. Só ganhou uma coluna nova, `lead_id` (nullable),
pra linkar a geração ao lead além do `business_id` já existente — o que também faz o Copiloto
contar pro mesmo rate limit diário por organização que os demais tipos.

## Alternativas consideradas

- Estender `AiKind`/`AiInput` genéricos com os campos do Copiloto (transcript, channel, notas) —
  rejeitada: infla o input de TODOS os outros tipos com campos que só um usa, e a rota genérica
  teria que ganhar um `if (kind === "contact_copilot")` pra montar o input diferente, quebrando a
  uniformidade que o mecanismo genérico existe pra garantir.
- Tabela própria como `business_ai_briefings` — rejeitada: o Copiloto não tem um estado "atual"
  único por empresa pra fazer upsert; cada análise de conversa é um evento pontual, o modelo de
  log de `ai_generations` encaixa melhor.

## Consequências

Positivo: `AiInput`/`aiOutputSchemas` genéricos continuam enxutos; o Copiloto pode evoluir seu
próprio contrato sem afetar os outros tipos. Negativo: mais um provider/prompt/schema pra manter
(mesmo custo que o briefing já paga) — aceito porque é o terceiro caso desse tipo, já é um padrão
reconhecível no código, não uma solução ad hoc.
