import { reportsConfig } from "@aypros/config";
import type { ApiErrorBody } from "@aypros/types";
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

type ReportModel = {
  business: BusinessReportRow;
  audit: AuditReportRow | null;
  score: ScoreReportRow | null;
  organizationName: string;
  senderName: string | null;
  generatedAt: string;
  findings: ReportFinding[];
  suggestions: string[];
};

const stateLabels: Record<ReportFinding["status"], string> = {
  problem: "Ponto de atencao",
  ok: "Ok",
  unknown: "Nao verificado",
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

  return null;
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

export function buildReportModel(params: {
  business: BusinessReportRow;
  audit: AuditReportRow | null;
  score: ScoreReportRow | null;
  organizationName: string;
  senderName: string | null;
  generatedAt?: string;
}): ReportModel {
  const findings = params.business.website_url
    ? [
        translateDetection({ code: "siteDown", state: detectionState(params.audit, "siteDown"), audit: params.audit }),
        translateDetection({ code: "sslError", state: detectionState(params.audit, "sslError"), audit: params.audit }),
        translateDetection({ code: "https", state: undefined, audit: params.audit }),
        translateDetection({ code: "hasViewport", state: detectionState(params.audit, "hasViewport"), audit: params.audit }),
        translateDetection({ code: "hasTitle", state: detectionState(params.audit, "hasTitle"), audit: params.audit }),
        translateDetection({ code: "hasDescription", state: detectionState(params.audit, "hasDescription"), audit: params.audit }),
        translateDetection({ code: "outdated", state: detectionState(params.audit, "outdated"), audit: params.audit }),
        translateDetection({ code: "basicBuilder", state: detectionState(params.audit, "basicBuilder"), audit: params.audit }),
      ].filter((finding): finding is ReportFinding => finding !== null)
    : noSiteFindings(params.business);

  const suggestions =
    params.score?.suggested_services && params.score.suggested_services.length > 0
      ? params.score.suggested_services
      : params.business.website_url
        ? ["Revisao da presenca digital", "Melhorias de conversao"]
        : ["Criacao de site", "SEO local"];

  return {
    business: params.business,
    audit: params.audit,
    score: params.score,
    organizationName: params.organizationName,
    senderName: params.senderName,
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    findings,
    suggestions,
  };
}

function addSectionTitle(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8).fontSize(15).fillColor("#111827").text(title).moveDown(0.35);
}

function addMuted(doc: PDFKit.PDFDocument, text: string) {
  doc.fontSize(9).fillColor("#6b7280").text(text);
}

function renderPdf(model: ReportModel): Promise<Buffer> {
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
    const scoreText = model.score
      ? `Score de oportunidade: ${model.score.score}/100 (${model.score.level}).`
      : "Score de oportunidade ainda nao calculado.";
    doc.fontSize(11).fillColor("#374151").text(scoreText, { lineGap: 3 });
    doc.text(
      model.business.website_url
        ? "A analise abaixo traduz sinais tecnicos do site em pontos praticos para melhorar confianca e conversao."
        : "Como nao ha site proprio identificado, o diagnostico foca no potencial de criar uma presenca digital controlada pela empresa.",
      { lineGap: 3 },
    );

    addSectionTitle(doc, "Principais achados");
    for (const finding of model.findings.slice(0, 8)) {
      doc.fontSize(11).fillColor(finding.status === "problem" ? "#991b1b" : "#111827").text(finding.title, { continued: false });
      doc.fontSize(9).fillColor("#6b7280").text(stateLabels[finding.status]);
      doc.fontSize(10).fillColor("#374151").text(finding.body, { lineGap: 2 });
      doc.fontSize(10).fillColor("#374151").text(`Impacto: ${finding.impact}`, { lineGap: 2 });
      doc.moveDown(0.45);
    }

    addSectionTitle(doc, "Servicos sugeridos");
    for (const service of model.suggestions.slice(0, 6)) {
      doc.fontSize(11).fillColor("#374151").text(`- ${service}`);
    }

    if (model.score?.reasons?.length) {
      addSectionTitle(doc, "Por que esta oportunidade apareceu");
      for (const reason of model.score.reasons.slice(0, 6)) {
        doc.fontSize(10).fillColor("#374151").text(`- ${reason.label} (${reason.impact > 0 ? "+" : ""}${reason.impact})`);
      }
    }

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

  app.get("/v1/businesses/:businessId/report.pdf", async (request, reply) => {
    const params = businessIdParamSchema.safeParse(request.params);
    if (!params.success) {
      return reply.code(400).send({ error: "Id invalido" } satisfies ApiErrorBody);
    }

    const ctx = await requireOrgContext(request, reply);
    if (!ctx) return;

    try {
      if (!(await canAccessBusiness(serviceDb, ctx.orgId, params.data.businessId))) {
        return reply.code(404).send({ error: "Empresa nao encontrada" } satisfies ApiErrorBody);
      }
      await ensureReportRateLimit(serviceDb, ctx.orgId);

      const [businessResult, auditResult, scoreResult, orgResult, profileResult] = await Promise.all([
        serviceDb
          .from("businesses")
          .select("id, name, address, city, state, phone, website_url, rating, review_count, categories, raw")
          .eq("id", params.data.businessId)
          .single(),
        serviceDb
          .from("website_audits")
          .select("id, status, final_url, http_status, response_time_ms, is_https, detections, error_code, created_at")
          .eq("organization_id", ctx.orgId)
          .eq("business_id", params.data.businessId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        serviceDb
          .from("opportunity_scores")
          .select("score, level, confidence, reasons, suggested_services, created_at")
          .eq("business_id", params.data.businessId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        serviceDb.from("organizations").select("name").eq("id", ctx.orgId).single(),
        serviceDb.from("profiles").select("full_name").eq("id", ctx.userId).maybeSingle(),
      ]);

      if (businessResult.error || !businessResult.data) {
        return reply.code(404).send({ error: "Empresa nao encontrada" } satisfies ApiErrorBody);
      }
      if (auditResult.error || scoreResult.error || orgResult.error) {
        throw new Error(auditResult.error?.message ?? scoreResult.error?.message ?? orgResult.error?.message);
      }

      const model = buildReportModel({
        business: businessResult.data as BusinessReportRow,
        audit: (auditResult.data as AuditReportRow | null) ?? null,
        score: (scoreResult.data as ScoreReportRow | null) ?? null,
        organizationName: (orgResult.data as { name: string }).name,
        senderName: (profileResult.data as { full_name: string | null } | null)?.full_name ?? null,
      });
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
