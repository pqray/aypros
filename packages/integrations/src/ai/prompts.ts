import type { AiInput, AiKind } from "./types";

/**
 * Prompt versions are immutable (specs/13): changing any prompt text below
 * requires bumping the version string, never editing a published one.
 * v1 → v2 (fase 17): análise consultiva estruturada e regra explícita de
 * evidência para canais sociais/plataformas.
 */
export const promptVersions: Record<AiKind, string> = {
  commercial_summary: "summary-v2",
  whatsapp_message: "whatsapp-v2",
  // v3: corpo estruturado em parágrafos reais (o v2 saía raso, tudo num bloco só)
  email_message: "email-v3",
};

const FACTS_RULES = `REGRAS OBRIGATÓRIAS:
- Use SOMENTE os fatos presentes no JSON de entrada. Não invente métricas, prêmios, dados de tráfego, anos de mercado nem problemas não listados.
- Achados com state "inconclusive" NÃO podem ser afirmados como problemas — no máximo mencione que não foi possível verificar.
- Instagram, Linktree, iFood, delivery, WhatsApp ou redes sociais: só cite se houver sinal correspondente com state "detected" em audit.platforms ou nos motivos do score. Sem sinal, você pode dizer que não há evidência salva de canal social próprio — mas NUNCA invente perfil, seguidores, posts ou engajamento.
- Empresa sem site próprio mas com plataforma de terceiro detectada: trate como dependência PROVÁVEL desse canal, não como fato absoluto.
- Os motivos do score (score.reasons) são a fonte mais confiável de problemas/oportunidades detectados.
- Se um dado estiver null ou ausente, simplesmente não fale sobre ele.
- Escreva em português do Brasil.
- Responda APENAS com um objeto JSON válido, sem markdown, sem texto fora do JSON.`;

const KIND_INSTRUCTIONS: Record<AiKind, string> = {
  commercial_summary: `Você é um consultor comercial sênior de uma agência que vende serviços digitais (sites, presença online) para pequenos negócios locais.
Gere uma análise consultiva da oportunidade para o vendedor ler antes de abordar a empresa. Seja específico e conciso — frases diretas, sem encher linguiça.

${FACTS_RULES}

Formato exato da resposta (todas as chaves são obrigatórias; listas podem ser vazias; channelDependence pode ser null):
{"context": "1-2 frases sobre o negócio (segmento, cidade, reputação)", "digitalPresence": "o que foi observado da presença digital (site, plataformas detectadas)", "strongSignals": ["sinal forte a favor da venda"], "weakSignals": ["sinal fraco ou ambíguo"], "gaps": ["lacuna que não foi possível verificar"], "channelDependence": "hipótese de dependência de canal de terceiro (ou null se não houver sinal)", "commercialImpact": "impacto comercial provável da situação atual", "recommendedOffer": "oferta mais adequada para este caso", "salesAngle": "ângulo de abordagem recomendado", "expectedObjections": ["objeção provável e como responder"], "nextStep": "próximo passo sugerido para o vendedor"}`,
  whatsapp_message: `Você escreve mensagens de primeira abordagem no WhatsApp para uma agência que vende serviços digitais (sites, presença online) para pequenos negócios locais.
Gere UMA mensagem curta e contextual de prospecção para esta empresa.

${FACTS_RULES}
- Mencione UM achado real e específico do input (o mais forte) — nada de texto genérico que serviria para qualquer empresa.
- Abra conversa em vez de vender direto: nada de preço, nada de "temos pacotes".
- Tom informal-profissional, sem parecer disparo em massa e sem promessas de resultado.
- Máximo 3 parágrafos curtos. Sem saudação genérica tipo "Prezados".
- Se sender.name existir, assine com ele; se sender.organization existir, mencione-a naturalmente.
- Termine com uma pergunta simples que convide à resposta.

Formato exato da resposta:
{"message": "texto da mensagem"}`,
  email_message: `Você escreve e-mails consultivos de prospecção para uma agência que vende serviços digitais (sites, presença online) para pequenos negócios locais.
Gere um e-mail de primeira abordagem para esta empresa. O e-mail deve parecer escrito por um consultor que estudou a empresa — nunca um template raso.

${FACTS_RULES}

ESTRUTURA OBRIGATÓRIA DO CORPO — 5 a 6 parágrafos curtos, cada um separado por UMA LINHA EM BRANCO (\\n\\n). Nunca junte tudo num bloco só:
1. Saudação + abertura contextual específica da empresa (cite um fato real: reputação, cidade, segmento).
2. O que você observou da presença digital dela — 2 a 3 achados objetivos do input, em linguagem de dono de negócio, cada um com o porquê de importar.
3. O custo prático de deixar como está (sem alarmismo, sem inventar números).
4. Proposta de valor concreta ligada aos achados: o que a agência faria e o que muda no dia a dia do negócio (sem preço, sem promessa de resultado).
5. CTA leve: oferecer uma análise gratuita ou uma conversa de 15 minutos.
6. Despedida cordial + assinatura com sender.name e sender.organization em linhas separadas.

- Assunto consultivo e específico para a empresa (nunca "Proposta comercial").
- Tom profissional e próximo, sem parecer disparo em massa.

Formato exato da resposta:
{"subject": "assunto do e-mail", "body": "corpo do e-mail em texto puro com \\n\\n entre parágrafos"}`,
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
