# 13 — IA (Groq)

Camada em `packages/integrations` (`AiProvider`), chamada **somente server-side**. Chave em env; nunca exposta ao cliente. Gerações persistidas em `ai_generations` (`04-database.md`).

## Casos de uso (enum `ai_kind`)

| Kind | Saída |
|---|---|
| `commercial_summary` | análise consultiva estruturada: contexto, presença digital, sinais, lacunas, impacto, oferta, ângulo e próximo passo |
| `whatsapp_message` | mensagem curta de WhatsApp (informal-profissional, pt-BR, sem parecer spam) |
| `email_message` | assunto + corpo de e-mail consultivo de prospecção |
| `contact_copilot` | planejado: interpreta conversa/nota de contato do lead e sugere resumo, objeções, follow-up, nota e próxima ação |

## Inputs estruturados

Montados no servidor a partir do banco — nunca texto livre do usuário como fonte de fatos:

- dados da empresa (nome, cidade, segmento, rating, contagem de avaliações);
- resultado da auditoria (achados com evidência);
- score, motivos e serviços sugeridos;
- opcional: nome/serviço do usuário remetente e tom desejado (campo controlado).

## Outputs JSON validados

- Prompt exige resposta em JSON com schema fixo; parse + validação **Zod** antes de persistir/exibir.
- JSON inválido → 1 retentativa com instrução corretiva → senão `failed` com mensagem clara.
- `commercial_summary` usa contrato estruturado (`summary-v2`): `context`, `digitalPresence`, `strongSignals`, `weakSignals`, `gaps`, `channelDependence`, `commercialImpact`, `recommendedOffer`, `salesAngle`, `expectedObjections`, `nextStep`.
- `email_message` usa `email-v4`: corpo com 5 a 6 parágrafos, pelo menos 450 caracteres e quebras reais entre parágrafos; corpo raso ou bloco único deve ser rejeitado.
- `contact_copilot` usará `contact-copilot-v1`: chat assistido para contato do lead, com resumo, objeções, resposta sugerida, nota pronta e próxima ação. Sugestões só podem ser aplicadas depois de confirmação do usuário.

## Proibição de inventar fatos

Regra explícita no prompt: usar **somente** os fatos fornecidos no input; não inventar métricas, prêmios, dados de tráfego ou problemas não detectados; achados `inconclusive` não podem ser afirmados como problemas.

Instagram, Linktree, iFood, delivery, WhatsApp e redes sociais só podem ser citados quando houver sinal `detected` em `audit.platforms`, nas detecções de segmento ou nos motivos do score. Sem sinal, a IA pode dizer que não há evidência salva de canal social próprio; nunca pode inventar perfil, seguidores, posts ou engajamento.

A UI mostra a mensagem como **rascunho editável** — usuário copia manualmente (envio automático é pós-MVP).

## Versionamento de prompts

- Prompts em código com identificador `prompt_version`, gravado em cada geração.
- Mudança de prompt = nova versão; nunca editar versão publicada.

Versões atuais:

- `commercial_summary`: `summary-v2`.
- `whatsapp_message`: `whatsapp-v2`.
- `email_message`: `email-v4`.
- Planejada: `contact_copilot`: `contact-copilot-v1`.

## Modelo, tokens e custo

- Modelo Groq definido em `packages/config` (um default + fallback); `max_tokens` limitado por kind.
- Registrar `model` e `tokens_used` por geração para acompanhamento de custo.
- Rate limit por organização (ex.: N gerações/dia no MVP — valor em config; enforcement em `17-security.md`).

## Fallback e erros

- Timeout (ex.: 30s) e erros do provider mapeados para mensagens amigáveis; retentativa manual.
- Indisponibilidade da Groq não pode quebrar nenhuma outra parte do produto (feature isolada).
