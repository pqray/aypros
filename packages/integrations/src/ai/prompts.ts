import type { AiInput, AiKind } from "./types";

/**
 * Prompt versions are immutable (specs/13): changing any prompt text below
 * requires bumping the version string, never editing a published one.
 */
export const promptVersions: Record<AiKind, string> = {
  commercial_summary: "summary-v1",
  whatsapp_message: "whatsapp-v1",
  email_message: "email-v1",
};

const FACTS_RULES = `REGRAS OBRIGATÓRIAS:
- Use SOMENTE os fatos presentes no JSON de entrada. Não invente métricas, prêmios, dados de tráfego, anos de mercado nem problemas não listados.
- Achados de auditoria com state "inconclusive" NÃO podem ser afirmados como problemas — no máximo mencione que não foi possível verificar.
- Os motivos do score (score.reasons) são a fonte mais confiável de problemas/oportunidades detectados.
- Se um dado estiver null ou ausente, simplesmente não fale sobre ele.
- Escreva em português do Brasil.
- Responda APENAS com um objeto JSON válido, sem markdown, sem texto fora do JSON.`;

const KIND_INSTRUCTIONS: Record<AiKind, string> = {
  commercial_summary: `Você é um analista comercial de uma agência que vende serviços digitais (sites, presença online) para pequenos negócios locais.
Gere um resumo comercial da oportunidade para o vendedor ler antes de abordar a empresa.

${FACTS_RULES}

Formato exato da resposta:
{"summary": "parágrafo curto com a situação digital atual da empresa", "painPoints": ["dor provável 1", "dor provável 2"], "salesAngle": "melhor ângulo de venda para a abordagem"}
- "painPoints": no máximo 5 itens, cada um derivado de um fato do input.`,
  whatsapp_message: `Você escreve mensagens de primeira abordagem no WhatsApp para uma agência que vende serviços digitais (sites, presença online) para pequenos negócios locais.
Gere UMA mensagem curta de prospecção para esta empresa.

${FACTS_RULES}
- Tom informal-profissional, direto, sem parecer spam e sem promessas de resultado.
- No máximo 3 parágrafos curtos. Sem saudação genérica tipo "Prezados".
- Se sender.name existir, assine com ele; se sender.organization existir, mencione-a naturalmente.
- Termine com uma pergunta simples que convide à resposta.

Formato exato da resposta:
{"message": "texto da mensagem"}`,
  email_message: `Você escreve e-mails de prospecção para uma agência que vende serviços digitais (sites, presença online) para pequenos negócios locais.
Gere um e-mail curto de primeira abordagem para esta empresa.

${FACTS_RULES}
- Tom profissional e cordial; parágrafos curtos; sem promessas de resultado.
- Assunto específico para a empresa (nunca genérico tipo "Proposta comercial").
- Se sender.name/sender.organization existirem, use na assinatura.

Formato exato da resposta:
{"subject": "assunto do e-mail", "body": "corpo do e-mail em texto puro"}`,
};

export type AiPromptMessages = Array<{ role: "system" | "user"; content: string }>;

export function buildPromptMessages(kind: AiKind, input: AiInput): AiPromptMessages {
  return [
    { role: "system", content: KIND_INSTRUCTIONS[kind] },
    { role: "user", content: `Fatos sobre a empresa (JSON):\n${JSON.stringify(input)}` },
  ];
}

/** Appended on the single corrective retry after invalid JSON (specs/13). */
export function buildCorrectiveMessages(
  kind: AiKind,
  input: AiInput,
  invalidOutput: string,
): AiPromptMessages {
  return [
    ...buildPromptMessages(kind, input),
    { role: "user", content: `Sua resposta anterior foi inválida:\n${invalidOutput.slice(0, 2000)}\n\nResponda novamente APENAS com o objeto JSON no formato exato pedido, sem nenhum outro texto.` },
  ];
}
