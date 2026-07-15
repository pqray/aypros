# 13 — IA (Groq)

Camada em `packages/integrations` (`AiProvider`), chamada **somente server-side**. Chave em env; nunca exposta ao cliente. Gerações persistidas em `ai_generations` (`04-database.md`).

## Casos de uso (enum `ai_kind`)

| Kind | Saída |
|---|---|
| `commercial_summary` | resumo comercial da oportunidade: situação digital, dores prováveis, ângulo de venda |
| `whatsapp_message` | mensagem curta de WhatsApp (informal-profissional, pt-BR, sem parecer spam) |
| `email_message` | assunto + corpo de e-mail de prospecção |

## Inputs estruturados

Montados no servidor a partir do banco — nunca texto livre do usuário como fonte de fatos:

- dados da empresa (nome, cidade, segmento, rating, contagem de avaliações);
- resultado da auditoria (achados com evidência);
- score, motivos e serviços sugeridos;
- opcional: nome/serviço do usuário remetente e tom desejado (campo controlado).

## Outputs JSON validados

- Prompt exige resposta em JSON com schema fixo; parse + validação **Zod** antes de persistir/exibir.
- JSON inválido → 1 retentativa com instrução corretiva → senão `failed` com mensagem clara.

## Proibição de inventar fatos

Regra explícita no prompt: usar **somente** os fatos fornecidos no input; não inventar métricas, prêmios, dados de tráfego ou problemas não detectados; achados `inconclusive` não podem ser afirmados como problemas. A UI mostra a mensagem como **rascunho editável** — usuário copia manualmente (envio automático é pós-MVP).

## Versionamento de prompts

- Prompts em código com identificador `prompt_version` (ex.: `whatsapp-v1`), gravado em cada geração.
- Mudança de prompt = nova versão; nunca editar versão publicada.

## Modelo, tokens e custo

- Modelo Groq definido em `packages/config` (um default + fallback); `max_tokens` limitado por kind.
- Registrar `model` e `tokens_used` por geração para acompanhamento de custo.
- Rate limit por organização (ex.: N gerações/dia no MVP — valor em config; enforcement em `17-security.md`).

## Fallback e erros

- Timeout (ex.: 30s) e erros do provider mapeados para mensagens amigáveis; retentativa manual.
- Indisponibilidade da Groq não pode quebrar nenhuma outra parte do produto (feature isolada).
