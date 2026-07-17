import { reportsConfig } from "@aypros/config";
import type { ApiErrorBody, BusinessReportResponse } from "@aypros/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FastifyInstance } from "fastify";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { canAccessBusiness } from "./audits";
import { requireOrgContext } from "./org-context";
import { createServiceRoleClient } from "./supabase";

const businessIdParamSchema = z.object({ businessId: z.string().uuid() });

type DetectionState = "detected" | "not_detected" | "inconclusive";

type BusinessReportRow = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website_url: string | null;
  rating: number | string | null;
  review_count: number | null;
  categories: string[] | null;
  raw: Record<string, unknown> | null;
};

type AuditReportRow = {
  id: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  final_url: string | null;
  http_status: number | null;
  response_time_ms: number | null;
  is_https: boolean | null;
  detections: Record<string, { state?: DetectionState; evidence?: Record<string, unknown> }> | null;
  error_code: string | null;
  created_at: string;
};

type ScoreReportRow = {
  score: number;
  level: "low" | "medium" | "high" | "very_high";
  confidence: "low" | "medium" | "high";
  reasons: Array<{ code: string; label: string; impact: number }>;
  suggested_services: string[];
  created_at: string;
};

export type ReportFinding = {
  title: string;
  body: string;
  impact: string;
  status: "problem" | "ok" | "unknown";
};

export type ReportRecommendation = {
  priority: "alta" | "media";
  text: string;
};

type ReportModel = {
  business: BusinessReportRow;
  audit: AuditReportRow | null;
  score: ScoreReportRow | null;
  organizationName: string;
  senderName: string | null;
  generatedAt: string;
  findings: ReportFinding[];
  suggestions: string[];
  maturity: MaturityAxis[];
  recommendations: ReportRecommendation[];
  nextSteps: string[];
};

const stateLabels: Record<ReportFinding["status"], string> = {
  problem: "Ponto de atencao",
  ok: "Ok",
  unknown: "Nao verificado",
};

const statusWeight: Record<ReportFinding["status"], number> = {
  problem: 0,
  ok: 1,
  unknown: 2,
};

function detectionState(
  audit: AuditReportRow | null,
  code: string,
): DetectionState | undefined {
  return audit?.detections?.[code]?.state;
}

export function translateDetection(params: {
  code: string;
  state: DetectionState | undefined;
  audit: AuditReportRow | null;
}): ReportFinding | null {
  const { code, state, audit } = params;

  if (code === "https") {
    if (audit?.is_https === false) {
      return {
        title: "Site sem acesso seguro",
        body: "O site analisado nao usa HTTPS como acesso final.",
        impact: "Navegadores podem exibir avisos e diminuir a confianca do visitante.",
        status: "problem",
      };
    }
    if (audit?.is_https === true) {
      return {
        title: "Acesso seguro ativo",
        body: "O site usa HTTPS no acesso final analisado.",
        impact: "Isso ajuda na confianca e evita alertas basicos no navegador.",
        status: "ok",
      };
    }
  }

  if (!state || state === "inconclusive") {
    const titleByCode: Record<string, string> = {
      hasViewport: "Adaptacao para celular",
      hasTitle: "Titulo do site",
      hasDescription: "Descricao no Google",
      outdated: "Sinais de atualizacao",
      basicBuilder: "Estrutura do site",
      siteDown: "Disponibilidade do site",
      sslError: "Acesso seguro",
    };
    return {
      title: titleByCode[code] ?? code,
      body: "Nao foi possivel confirmar este ponto apenas com a leitura tecnica do site.",
      impact: "Tratamos como nao verificado, nunca como problema confirmado.",
      status: "unknown",
    };
  }

  if (code === "siteDown" || code === "sslError") {
    return state === "detected"
      ? {
          title: "O site pode estar indisponivel",
          body: "O cliente pode tentar abrir o site e encontrar erro ou uma pagina que nao carrega.",
          impact: "Isso reduz confianca e faz contatos interessados desistirem antes de chamar.",
          status: "problem",
        }
      : {
          title: "Site acessivel",
          body: "A auditoria conseguiu acessar o site no momento da analise.",
          impact: "Esse ponto nao parece impedir o cliente de conhecer a empresa.",
          status: "ok",
        };
  }

  if (code === "hasViewport") {
    return state === "not_detected"
      ? {
          title: "Site nao se adapta bem ao celular",
          body: "A pagina nao informa ao navegador como deve se ajustar em telas pequenas.",
          impact: "A maioria dos clientes pesquisa pelo celular; uma experiencia ruim pode reduzir contatos.",
          status: "problem",
        }
      : {
          title: "Site preparado para celular",
          body: "O site tem sinal tecnico de adaptacao para telas pequenas.",
          impact: "Isso ajuda quem chega pelo celular a entender a oferta com menos atrito.",
          status: "ok",
        };
  }

  if (code === "hasTitle" || code === "hasDescription") {
    return state === "not_detected"
      ? {
          title: code === "hasTitle" ? "Titulo fraco ou ausente" : "Descricao ausente",
          body:
            code === "hasTitle"
              ? "O site nao apresenta um titulo claro para a pagina analisada."
              : "O site nao apresenta uma descricao clara para buscadores e compartilhamentos.",
          impact: "Fica mais dificil entender rapidamente o que a empresa oferece.",
          status: "problem",
        }
      : {
          title: code === "hasTitle" ? "Titulo encontrado" : "Descricao encontrada",
          body: "A pagina tem informacao basica para contextualizar a empresa.",
          impact: "Esse ponto ajuda na apresentacao e no compartilhamento do site.",
          status: "ok",
        };
  }

  if (code === "outdated") {
    return state === "detected"
      ? {
          title: "Sinais de site desatualizado",
          body: "Encontramos indicios de conteudo ou estrutura antiga no site.",
          impact: "A percepcao de abandono pode reduzir a confianca antes do primeiro contato.",
          status: "problem",
        }
      : {
          title: "Sem sinal claro de abandono",
          body: "Nao encontramos indicios fortes de site desatualizado.",
          impact: "Ainda vale revisar conteudo, mas este ponto nao apareceu como problema.",
          status: "ok",
        };
  }

  if (code === "basicBuilder") {
    return state === "detected"
      ? {
          title: "Site com estrutura muito basica",
          body: "A estrutura encontrada sugere um site simples ou feito em plataforma basica.",
          impact: "Pode limitar personalizacao, velocidade e capacidade de conversao.",
          status: "problem",
        }
      : {
          title: "Estrutura sem alerta basico",
          body: "Nao encontramos sinal forte de estrutura muito limitada.",
          impact: "Esse ponto nao apareceu como obstaculo nesta analise.",
          status: "ok",
        };
  }

  // Sinais sociais/segmento (fase 15) — so entram no relatorio quando detectados;
  // ausencia de sinal nao vira afirmacao (fase 17).
  if (code === "linkInBio" && state === "detected") {
    return {
      title: "Presenca concentrada em link-in-bio",
      body: "O endereco divulgado aponta para uma pagina de links (ex.: Linktree), nao para um site proprio.",
      impact: "A apresentacao da empresa fica dependente de uma pagina generica de terceiros.",
      status: "problem",
    };
  }

  if (code === "deliveryPlatform" && state === "detected") {
    return {
      title: "Vendas dependem de plataforma de delivery",
      body: "O canal digital encontrado e uma plataforma de delivery de terceiros.",
      impact: "Cada pedido paga comissao e o relacionamento com o cliente fica com a plataforma.",
      status: "problem",
    };
  }

  if (code === "menuOnline" && state === "not_detected") {
    return {
      title: "Sem cardapio online proprio",
      body: "Nao encontramos cardapio online proprio vinculado a presenca digital da empresa.",
      impact: "Clientes que pesquisam antes de pedir nao encontram os produtos direto da empresa.",
      status: "problem",
    };
  }

  return null;
}

export type MaturityAxis = {
  label: string;
  /** 0-100; null = nao verificado (nunca desenhado como zero). */
  value: number | null;
};

/**
 * Eixos de maturidade digital do PDF v2 — derivados só de fatos auditados;
 * eixo sem evidencia vira "nao verificado" em vez de nota baixa.
 */
export function buildMaturityAxes(params: {
  business: Pick<BusinessReportRow, "website_url">;
  audit: AuditReportRow | null;
}): MaturityAxis[] {
  const { business, audit } = params;
  const hasSite = Boolean(business.website_url);

  function fromDetection(code: string, invert = false): number | null {
    const state = detectionState(audit, code);
    if (!state || state === "inconclusive") return null;
    const positive = invert ? state === "not_detected" : state === "detected";
    return positive ? 90 : 25;
  }

  const seoSignals = [fromDetection("hasTitle"), fromDetection("hasDescription")].filter(
    (value): value is number => value !== null,
  );

  let performance: number | null = null;
  if (audit?.response_time_ms !== null && audit?.response_time_ms !== undefined) {
    performance = audit.response_time_ms <= 1000 ? 90 : audit.response_time_ms <= 3000 ? 60 : 25;
  }

  let trust: number | null = null;
  if (audit?.is_https === true) trust = 90;
  else if (audit?.is_https === false) trust = 25;
  if (detectionState(audit, "sslError") === "detected") trust = 15;

  return [
    { label: "Site proprio", value: hasSite ? 90 : 10 },
    { label: "Adaptacao para celular", value: hasSite ? fromDetection("hasViewport") : 10 },
    {
      label: "SEO basico",
      value: hasSite
        ? seoSignals.length > 0
          ? Math.round(seoSignals.reduce((sum, value) => sum + value, 0) / seoSignals.length)
          : null
        : 10,
    },
    { label: "Velocidade", value: hasSite ? performance : null },
    { label: "Confianca (HTTPS)", value: hasSite ? trust : null },
  ];
}

function businessSummary(business: BusinessReportRow): string {
  const parts = [
    business.city && business.state ? `${business.city}/${business.state}` : business.city,
    business.rating !== null ? `nota ${Number(business.rating).toFixed(1)}` : null,
    business.review_count !== null ? `${business.review_count} avaliacoes` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" - ") : "Dados publicos do perfil da empresa";
}

function noSiteFindings(business: BusinessReportRow): ReportFinding[] {
  const socialOnly = business.raw?.socialOnly === true || business.raw?.social_only === true;
  return [
    {
      title: socialOnly ? "Presenca depende de rede social" : "Empresa sem site proprio",
      body: socialOnly
        ? "O endereco encontrado aponta para uma rede social, nao para um site proprio."
        : "Nao encontramos site proprio vinculado ao perfil publico desta empresa.",
      impact:
        "Um site proprio ajuda a apresentar servicos, diferenciais, localizacao e formas de contato em um lugar controlado pela empresa.",
      status: "problem",
    },
  ];
}

/**
 * 401/403/429 no acesso final significam "o site bloqueia robôs", não "o site
 * está fora do ar" — vira nota informativa, nunca problema (fase 17 follow-up).
 */
export function botBlockedByStatus(audit: AuditReportRow | null): boolean {
  return audit?.http_status === 401 || audit?.http_status === 403 || audit?.http_status === 429;
}

export function friendlyHttpStatusNote(audit: AuditReportRow | null): string | null {
  if (!audit) return null;
  const status = audit.http_status;
  if (status === null) {
    return audit.error_code ? "O site nao respondeu a verificacao automatica." : null;
  }
  if (botBlockedByStatus(audit)) {
    return `O site bloqueia verificacoes automaticas (HTTP ${status}) — provavelmente esta no ar normalmente para visitantes.`;
  }
  if (status >= 200 && status < 300) return "Site no ar e respondendo normalmente.";
  if (status >= 300 && status < 400) return "O site redireciona para outro endereco.";
  if (status === 404) return "O endereco analisado nao foi encontrado (HTTP 404).";
  if (status >= 500) return `O servidor do site respondeu com erro (HTTP ${status}).`;
  return `O site respondeu com HTTP ${status}.`;
}

export function buildReportModel(params: {
  business: BusinessReportRow;
  audit: AuditReportRow | null;
  score: ScoreReportRow | null;
  organizationName: string;
  senderName: string | null;
  generatedAt?: string;
}): ReportModel {
  const botBlocked = botBlockedByStatus(params.audit);
  const botBlockedNote: ReportFinding = {
    title: "Site com protecao contra acesso automatico",
    body: "O site respondeu com bloqueio para a verificacao automatica — comum em sites atras de firewall/CDN.",
    impact: "A leitura tecnica fica limitada; os pontos marcados como nao verificados nao sao problemas confirmados.",
    status: "unknown",
  };
  const sortedFindings = params.business.website_url
    ? [
        translateDetection({
          code: "siteDown",
          // Bloqueio de robô não é site fora do ar — nunca afirmar indisponibilidade.
          state: botBlocked ? "inconclusive" : detectionState(params.audit, "siteDown"),
          audit: params.audit,
        }),
        translateDetection({ code: "sslError", state: detectionState(params.audit, "sslError"), audit: params.audit }),
        translateDetection({ code: "https", state: undefined, audit: params.audit }),
        translateDetection({ code: "hasViewport", state: detectionState(params.audit, "hasViewport"), audit: params.audit }),
        translateDetection({ code: "hasTitle", state: detectionState(params.audit, "hasTitle"), audit: params.audit }),
        translateDetection({ code: "hasDescription", state: detectionState(params.audit, "hasDescription"), audit: params.audit }),
        translateDetection({ code: "outdated", state: detectionState(params.audit, "outdated"), audit: params.audit }),
        translateDetection({ code: "basicBuilder", state: detectionState(params.audit, "basicBuilder"), audit: params.audit }),
        translateDetection({ code: "linkInBio", state: detectionState(params.audit, "linkInBio"), audit: params.audit }),
        translateDetection({ code: "deliveryPlatform", state: detectionState(params.audit, "deliveryPlatform"), audit: params.audit }),
        translateDetection({ code: "menuOnline", state: detectionState(params.audit, "menuOnline"), audit: params.audit }),
      ]
        .filter((finding): finding is ReportFinding => finding !== null)
        // Problemas primeiro: são o que o dono do negócio precisa ver, e o PDF
        // corta a lista — um achado de segmento não pode ficar de fora por
        // chegar depois dos "Ok".
        .sort((a, b) => statusWeight[a.status] - statusWeight[b.status])
    : noSiteFindings(params.business);

  // A nota de bloqueio contextualiza os "nao verificados" — vem antes de tudo.
  const findings =
    botBlocked && params.business.website_url ? [botBlockedNote, ...sortedFindings] : sortedFindings;

  const suggestions =
    params.score?.suggested_services && params.score.suggested_services.length > 0
      ? params.score.suggested_services
      : params.business.website_url
        ? ["Revisao da presenca digital", "Melhorias de conversao"]
        : ["Criacao de site", "SEO local"];

  const problems = findings.filter((finding) => finding.status === "problem");
  const recommendations: ReportRecommendation[] = [
    ...problems.slice(0, 3).map((finding) => ({
      priority: "alta" as const,
      text: `Resolver: ${finding.title.toLowerCase()}`,
    })),
    ...suggestions.slice(0, 3).map((service) => ({ priority: "media" as const, text: service })),
  ];

  const nextSteps = [
    "Validar este diagnostico em uma conversa rapida com a empresa.",
    problems.length > 0
      ? `Priorizar o ponto de maior impacto: ${problems[0]!.title.toLowerCase()}.`
      : "Aprofundar a analise nos pontos marcados como nao verificados.",
    `Apresentar uma proposta de ${suggestions[0]?.toLowerCase() ?? "presenca digital"} com escopo e prazo.`,
  ];

  return {
    business: params.business,
    audit: params.audit,
    score: params.score,
    organizationName: params.organizationName,
    senderName: params.senderName,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    findings,
    suggestions,
    maturity: buildMaturityAxes({ business: params.business, audit: params.audit }),
    recommendations,
    nextSteps,
  };
}

export function executiveSummary(model: ReportModel): string {
  const problemCount = model.findings.filter((finding) => finding.status === "problem").length;
  return model.business.website_url
    ? `Analisamos a presenca digital de ${model.business.name} e encontramos ${problemCount} ponto(s) de atencao com impacto direto em confianca e conversao.`
    : `${model.business.name} ainda nao tem site proprio identificado. O diagnostico foca no potencial de construir uma presenca digital controlada pela empresa, aproveitando a reputacao ja existente.`;
}

export function buildReportResponse(model: ReportModel): BusinessReportResponse {
  return {
    summary: executiveSummary(model),
    score: model.score
      ? { score: model.score.score, level: model.score.level, confidence: model.score.confidence }
      : null,
    httpStatusNote: friendlyHttpStatusNote(model.audit),
    findings: model.findings,
    maturity: model.maturity,
    recommendations: model.recommendations,
    nextSteps: model.nextSteps,
    generatedAt: model.generatedAt,
  };
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8).fontSize(15).fillColor("#111827").text(title).moveDown(0.35);
}

function addMuted(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(9).fillColor("#6b7280").text(text);
}

function scoreBarColor(value: number): string {
  if (value >= 70) return "#2f7d54";
  if (value >= 40) return "#9a6b1f";
  return "#991b1b";
}

/** Barra horizontal simples (0-100) — o "grafico" permitido no MVP do PDF v2. */
function drawBar(
  doc: PDFKit.PDFDocument,
  params: { x: number; y: number; width: number; height: number; value: number; color: string },
) {
  doc.roundedRect(params.x, params.y, params.width, params.height, params.height / 2).fill("#e5e7eb");
  const filled = Math.max(params.height, (params.value / 100) * params.width);
  doc
    .roundedRect(params.x, params.y, filled, params.height, params.height / 2)
    .fill(params.color);
}

export function renderPdf(model: ReportModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, info: { Title: `Diagnostico - ${model.business.name}` } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.rect(0, 0, doc.page.width, 92).fill("#111827");
    doc.fillColor("#ffffff").fontSize(22).text("Diagnostico de presenca digital", 48, 34);
    doc.fontSize(11).text(model.organizationName, 48, 62);

    doc.y = 120;
    doc.fillColor("#111827").fontSize(24).text(model.business.name);
    addMuted(doc, businessSummary(model.business));
    if (model.business.website_url) addMuted(doc, `Site analisado: ${model.business.website_url}`);
    addMuted(doc, `Gerado em ${new Date(model.generatedAt).toLocaleDateString("pt-BR")}`);

    addSectionTitle(doc, "Resumo executivo");
    doc.fontSize(11).fillColor("#374151").text(executiveSummary(model), { lineGap: 3 });
    const statusNote = friendlyHttpStatusNote(model.audit);
    if (statusNote) {
      addMuted(doc, statusNote);
    }

    if (model.score) {
      doc.moveDown(0.6);
      doc.fontSize(10).fillColor("#374151").text(`Potencial da oportunidade: ${model.score.score}/100`);
      drawBar(doc, {
        x: 48,
        y: doc.y + 4,
        width: doc.page.width - 96,
        height: 10,
        value: model.score.score,
        color: scoreBarColor(model.score.score),
      });
      doc.y += 20;
      addMuted(doc, `Confianca da analise: ${model.score.confidence === "high" ? "alta" : model.score.confidence === "medium" ? "media" : "baixa"}.`);
    } else {
      addMuted(doc, "Score de oportunidade ainda nao calculado.");
    }

    addSectionTitle(doc, "Maturidade digital por eixo");
    for (const axis of model.maturity) {
      doc.fontSize(10).fillColor("#374151").text(axis.label, 48, doc.y, { continued: false });
      if (axis.value === null) {
        addMuted(doc, "Nao verificado nesta analise");
        doc.moveDown(0.35);
      } else {
        drawBar(doc, {
          x: 48,
          y: doc.y + 3,
          width: doc.page.width - 96,
          height: 7,
          value: axis.value,
          color: scoreBarColor(axis.value),
        });
        doc.y += 16;
      }
    }

    addSectionTitle(doc, "Principais achados");
    for (const finding of model.findings.slice(0, 10)) {
      doc.fontSize(11).fillColor(finding.status === "problem" ? "#991b1b" : "#111827").text(finding.title, { continued: false });
      doc.fontSize(9).fillColor("#6b7280").text(stateLabels[finding.status]);
      doc.fontSize(10).fillColor("#374151").text(finding.body, { lineGap: 2 });
      doc.fontSize(10).fillColor("#374151").text(`Impacto: ${finding.impact}`, { lineGap: 2 });
      doc.moveDown(0.45);
    }

    addSectionTitle(doc, "Recomendacoes por prioridade");
    for (const recommendation of model.recommendations.slice(0, 6)) {
      doc
        .fontSize(9)
        .fillColor(recommendation.priority === "alta" ? "#991b1b" : "#9a6b1f")
        .text(recommendation.priority === "alta" ? "PRIORIDADE ALTA" : "PRIORIDADE MEDIA");
      doc.fontSize(11).fillColor("#374151").text(recommendation.text, { lineGap: 2 });
      doc.moveDown(0.35);
    }

    if (model.score?.reasons?.length) {
      addSectionTitle(doc, "Por que esta oportunidade apareceu");
      for (const reason of model.score.reasons.slice(0, 6)) {
        doc.fontSize(10).fillColor("#374151").text(`- ${reason.label} (${reason.impact > 0 ? "+" : ""}${reason.impact})`);
      }
    }

    addSectionTitle(doc, "Proximos passos sugeridos");
    model.nextSteps.forEach((step, index) => {
      doc.fontSize(11).fillColor("#374151").text(`${index + 1}. ${step}`, { lineGap: 2 });
    });

    doc.moveDown(1.2);
    doc.fontSize(9).fillColor("#6b7280").text(
      `Relatorio gerado por ${model.organizationName}${model.senderName ? ` - ${model.senderName}` : ""}. Conteudo baseado somente em dados salvos no Aypros.`,
      { align: "center" },
    );

    doc.end();
  });
}

async function ensureReportRateLimit(db: SupabaseClient, orgId: string) {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await db
    .from("activities")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", orgId)
    .eq("type", "export_created")
    .contains("payload", { kind: "business_report" })
    .gte("created_at", windowStart);

  if (error) {
    throw new Error(`report rate limit check failed: ${error.message}`);
  }
  if ((count ?? 0) >= reportsConfig.maxReportsPerOrgPerHour) {
    const rateError = new Error("REPORT_RATE_LIMITED");
    rateError.name = "RateLimitError";
    throw rateError;
  }
}

function filenameForBusiness(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `diagnostico-${slug || "empresa"}.pdf`;
}

export type ReportRoutesOptions = {
  serviceDb?: SupabaseClient;
};

export function registerReportRoutes(app: FastifyInstance, options: ReportRoutesOptions = {}) {
  const serviceDb = options.serviceDb ?? createServiceRoleClient();

  async function loadModel(orgId: string, userId: string, businessId: string) {
    if (!(await canAccessBusiness(serviceDb, orgId, businessId))) {
      return null;
    }

    const [businessResult, auditResult, scoreResult, orgResult, profileResult] = await Promise.all([
      serviceDb
        .from("businesses")
        .select("id, name, address, city, state, phone, website_url, rating, review_count, categories, raw")
        .eq("id", businessId)
        .single(),
      serviceDb
        .from("website_audits")
        .select("id, status, final_url, http_status, response_time_ms, is_https, detections, error_code, created_at")
        .eq("organization_id", orgId)
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      serviceDb
        .from("opportunity_scores")
        .select("score, level, confidence, reasons, suggested_services, created_at")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      serviceDb.from("organizations").select("name").eq("id", orgId).single(),
      serviceDb.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    ]);

    if (businessResult.error || !businessResult.data) {
      return null;
    }
    if (auditResult.error || scoreResult.error || orgResult.error) {
      throw new Error(auditResult.error?.message ?? scoreResult.error?.message ?? orgResult.error?.message);
    }

    return buildReportModel({
      business: businessResult.data as BusinessReportRow,
      audit: (auditResult.data as AuditReportRow | null) ?? null,
      score: (scoreResult.data as ScoreReportRow | null) ?? null,
      organizationName: (orgResult.data as { name: string }).name,
      senderName: (profileResult.data as { full_name: string | null } | null)?.full_name ?? null,
    });
  }

  // Diagnóstico como JSON — mesma fonte do PDF, para render direto na UI.
  app.get("/v1/businesses/:businessId/report", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id invalido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      const model = await loadModel(ctx.orgId, ctx.userId, params.data.businessId);
      if (!model) {
        return reply.code(404).send({ error: "Empresa nao encontrada" } satisfies ApiErrorBody);
      }
      return reply.send(buildReportResponse(model));
    } catch (error) {
      request.log.error({ err: error }, "business report json failed");
      return reply.code(500).send({ error: "Erro ao carregar diagnostico" } satisfies ApiErrorBody);
    }
  });

  app.get("/v1/businesses/:businessId/report.pdf", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id invalido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      await ensureReportRateLimit(serviceDb, ctx.orgId);
      const model = await loadModel(ctx.orgId, ctx.userId, params.data.businessId);
      if (!model) {
        return reply.code(404).send({ error: "Empresa nao encontrada" } satisfies ApiErrorBody);
      }
      const pdf = await renderPdf(model);

      await serviceDb.from("activities").insert({
        organization_id: ctx.orgId,
        business_id: params.data.businessId,
        actor_id: ctx.userId,
        type: "export_created",
        payload: { kind: "business_report", business_name: model.business.name },
      });

      return reply
        .header("content-type", "application/pdf")
        .header("content-disposition", `attachment; filename="${filenameForBusiness(model.business.name)}"`)
        .send(pdf);
    } catch (error) {
      if (error instanceof Error && error.name === "RateLimitError") {
        return reply.code(429).send({
          error: "Limite de relatorios por hora atingido",
          code: "RATE_LIMITED",
        } satisfies ApiErrorBody);
      }
      request.log.error({ err: error }, "business report failed");
      return reply.code(500).send({ error: "Erro ao gerar relatorio" } satisfies ApiErrorBody);
    }
  });
}
