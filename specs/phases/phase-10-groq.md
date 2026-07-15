# Fase 10 — IA (Groq)

## Objetivo

Geração de resumo comercial, mensagem de WhatsApp e e-mail de prospecção com Groq — inputs estruturados, outputs JSON validados, prompts versionados e limites de uso.

## Specs-base para leitura

`00-project-rules.md`, `13-ai-groq.md`, `17-security.md` (secrets, rate limiting), `14-data-fetching-state.md` (consulta: mutações), `04-database.md` (consulta: `ai_generations`).

## Dependências (instalar nesta fase)

SDK da Groq (`groq-sdk`).

## Arquivos esperados

- `packages/integrations/ai/*`: `AiProvider` (Groq), prompts versionados por kind, schemas Zod dos outputs, retry de JSON inválido, mapeamento de erros.
- `features/ai/*`: UI de geração na página da empresa e no detalhe do lead — botão gerar, loading, resultado como rascunho editável com copiar, regenerar.
- Persistência em `ai_generations` (model, tokens, prompt_version) + atividade `ai_generated`.

## Tarefas

1. Camada Groq server-side com timeout e erros amigáveis.
2. Prompts v1 por kind (summary, whatsapp, email) com regra explícita de não inventar fatos e exigência de JSON.
3. Montagem do input estruturado a partir do banco (empresa + auditoria + score).
4. Validação Zod do output; 1 retry corretivo; `failed` claro.
5. UI de rascunho editável (nunca envio automático) + copiar.
6. Rate limit por org (N/dia) + registro de tokens.

## Critérios de aceite

- [ ] Chave Groq só server-side
- [ ] Output inválido nunca chega cru à UI (Zod barra)
- [ ] Mensagens usam apenas fatos do input; `inconclusive` não vira afirmação
- [ ] Indisponibilidade da Groq não afeta o restante do produto
- [ ] Gerações persistidas com versão de prompt e tokens

## Testes necessários

P1: schemas Zod dos outputs (válido/inválido/parcial); montagem do input estruturado (unit); mapeamento de erros do provider (mockado).

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + gerações manuais em 2–3 empresas reais avaliando qualidade.

## Fora do escopo

Envio automático (roadmap); sequências; IA visual.

## Riscos

Alucinação apesar do prompt — mitigar com input estreito e revisão humana (rascunho); custo — limites desde o dia 1.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Qualidade das gerações validada pelo usuário
- [ ] Aprovação antes da Fase 11
