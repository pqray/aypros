import { describe, expect, it } from "vitest";
import {
  buildMaturityAxes,
  buildReportModel,
  buildReportResponse,
  friendlyHttpStatusNote,
  translateDetection,
} from "./reports";

const baseAudit = {
  id: "a1",
  status: "completed" as const,
  final_url: "https://example.com",
  http_status: 200,
  response_time_ms: 800,
  is_https: true,
  detections: {},
  error_code: null,
  created_at: "2026-07-17T12:00:00Z",
};

describe("translateDetection", () => {
  it("does not turn inconclusive findings into problems", () => {
    expect(
      translateDetection({ code: "hasViewport", state: "inconclusive", audit: null }),
    ).toMatchObject({
      status: "unknown",
      title: "Adaptação para celular",
    });
  });

  it("translates missing viewport into client-facing impact", () => {
    expect(
      translateDetection({ code: "hasViewport", state: "not_detected", audit: null }),
    ).toMatchObject({
      status: "problem",
      title: "Site não se adapta bem ao celular",
    });
  });

  it("translates HTTPS state from the audit row", () => {
    expect(
      translateDetection({
        code: "https",
        state: undefined,
        audit: {
          id: "a1",
          status: "completed",
          final_url: "http://example.com",
          http_status: 200,
          response_time_ms: 120,
          is_https: false,
          detections: {},
          error_code: null,
          created_at: "2026-07-17T12:00:00Z",
        },
      }),
    ).toMatchObject({
      status: "problem",
      title: "Site sem acesso seguro",
    });
  });
});

describe("buildReportModel", () => {
  it("creates a useful report model for a business without website", () => {
    const model = buildReportModel({
      business: {
        id: "b1",
        name: "Padaria Central",
        address: null,
        city: "Fortaleza",
        state: "CE",
        phone: "+558532241234",
        website_url: null,
        rating: "4.6",
        review_count: 120,
        categories: ["bakery"],
        raw: {},
      },
      audit: null,
      score: null,
      organizationName: "Agencia Aypros",
      senderName: "Rayssa",
      generatedAt: "2026-07-17T12:00:00Z",
    });

    expect(model.findings[0]).toMatchObject({
      status: "problem",
      title: "Empresa sem site próprio",
    });
    expect(model.suggestions).toContain("Criação de site");
    expect(model.maturity.find((axis) => axis.label === "Site próprio")?.value).toBe(10);
    expect(model.recommendations[0]).toMatchObject({ priority: "alta" });
    expect(model.nextSteps).toHaveLength(3);
  });

  it("includes detected segment signals as findings and skips absent ones", () => {
    const model = buildReportModel({
      business: {
        id: "b1",
        name: "Padaria Central",
        address: null,
        city: "Fortaleza",
        state: "CE",
        phone: null,
        website_url: "https://padaria.ifood.com.br/loja",
        rating: null,
        review_count: null,
        categories: ["bakery"],
        raw: {},
      },
      audit: {
        ...baseAudit,
        detections: {
          deliveryPlatform: { state: "detected" },
          menuOnline: { state: "not_detected" },
          linkInBio: { state: "inconclusive" },
        },
      },
      score: null,
      organizationName: "Agencia Aypros",
      senderName: null,
      generatedAt: "2026-07-17T12:00:00Z",
    });

    const titles = model.findings.map((finding) => finding.title);
    expect(titles).toContain("Vendas dependem de plataforma de delivery");
    expect(titles).toContain("Sem cardápio online próprio");
    // inconclusive nunca vira achado social afirmado
    expect(titles).not.toContain("Presença concentrada em link-in-bio");
  });

  it("includes detected Instagram and social-only context", () => {
    const model = buildReportModel({
      business: {
        id: "b1",
        name: "Studio Fit",
        address: null,
        city: "MacaÃ©",
        state: "RJ",
        phone: null,
        website_url: null,
        rating: null,
        review_count: null,
        categories: ["gym"],
        raw: { socialOnly: true, socialPlatform: "instagram.com" },
      },
      audit: null,
      score: null,
      organizationName: "Agencia",
      senderName: null,
      generatedAt: "2026-07-17T12:00:00Z",
    });

    expect(model.findings[0]).toMatchObject({
      status: "problem",
      title: "Presença depende do Instagram",
    });
    expect(model.maturity.find((axis) => axis.label === "Presença social")?.value).toBe(70);
  });

  it("reports Instagram connected to a website when audited", () => {
    const model = buildReportModel({
      business: {
        id: "b1",
        name: "Studio Fit",
        address: null,
        city: "MacaÃ©",
        state: "RJ",
        phone: null,
        website_url: "https://studiofit.example",
        rating: null,
        review_count: null,
        categories: ["gym"],
        raw: {},
      },
      audit: {
        ...baseAudit,
        detections: {
          instagram: { state: "detected", evidence: { links: ["https://instagram.com/studiofit"] } },
          socialLinks: { state: "detected", evidence: { links: ["https://instagram.com/studiofit"] } },
        },
      },
      score: null,
      organizationName: "Agencia",
      senderName: null,
      generatedAt: "2026-07-17T12:00:00Z",
    });

    expect(model.findings.map((finding) => finding.title)).toContain("Instagram conectado ao site");
    expect(model.maturity.find((axis) => axis.label === "Presença social")?.value).toBe(85);
  });

  it("prioritizes problems as alta and suggestions as média", () => {
    const model = buildReportModel({
      business: {
        id: "b1",
        name: "Lojá X",
        address: null,
        city: null,
        state: null,
        phone: null,
        website_url: "https://lojax.com.br",
        rating: null,
        review_count: null,
        categories: [],
        raw: {},
      },
      audit: {
        ...baseAudit,
        is_https: false,
        detections: { hasViewport: { state: "not_detected" } },
      },
      score: {
        score: 70,
        level: "high",
        confidence: "medium",
        reasons: [],
        suggested_services: ["Criação de site moderno"],
        created_at: "2026-07-17T12:00:00Z",
      },
      organizationName: "Agencia",
      senderName: null,
    });

    const altas = model.recommendations.filter((rec) => rec.priority === "alta");
    const médias = model.recommendations.filter((rec) => rec.priority === "media");
    expect(altas.length).toBeGreaterThan(0);
    expect(médias.map((rec) => rec.text)).toContain("Criação de site moderno");
    // alta sempre vem antes de média
    expect(model.recommendations.findIndex((rec) => rec.priority === "media")).toBeGreaterThan(
      model.recommendations.findIndex((rec) => rec.priority === "alta"),
    );
  });
});

describe("bot-blocked sites (HTTP 401/403/429)", () => {
  const blockedModel = () =>
    buildReportModel({
      business: {
        id: "b1",
        name: "Lojá Protegida",
        address: null,
        city: null,
        state: null,
        phone: null,
        website_url: "https://lojaprotegida.com.br",
        rating: null,
        review_count: null,
        categories: [],
        raw: {},
      },
      audit: {
        ...baseAudit,
        http_status: 403,
        detections: { siteDown: { state: "detected" } },
      },
      score: null,
      organizationName: "Agencia",
      senderName: null,
      generatedAt: "2026-07-17T12:00:00Z",
    });

  it("explains the block instead of showing a raw status", () => {
    const note = friendlyHttpStatusNote({ ...baseAudit, http_status: 403 });
    expect(note).toContain("bloqueou a verificação automática");
    expect(note).not.toContain("403");
    expect(friendlyHttpStatusNote({ ...baseAudit, http_status: 200 })).toContain("no ar");
  });

  it("never claims the site is down when it just blocks bots", () => {
    const model = blockedModel();
    const titles = model.findings.map((finding) => finding.title);
    expect(titles).not.toContain("O site pode estar indisponível");
    expect(model.findings[0]).toMatchObject({
      title: "Site com proteção contra acesso automático",
      status: "unknown",
    });
  });

  it("exposes the friendly note in the JSON response", () => {
    const response = buildReportResponse(blockedModel());
    expect(response.httpStatusNote).toContain("bloqueou a verificação automática");
    expect(response.httpStatusNote).not.toContain("403");
    expect(response.summary).toContain("Lojá Protegida");
    expect(response.maturity.length).toBeGreaterThan(0);
    expect(response.nextSteps).toHaveLength(3);
  });
});

describe("buildMaturityAxes", () => {
  it("marks unaudited axes as null (não verificado) instead of low score", () => {
    const axes = buildMaturityAxes({
      business: { website_url: "https://example.com", raw: {} },
      audit: null,
    });

    expect(axes.find((axis) => axis.label === "Site próprio")?.value).toBe(90);
    expect(axes.find((axis) => axis.label === "Adaptação para celular")?.value).toBeNull();
    expect(axes.find((axis) => axis.label === "Velocidade")?.value).toBeNull();
  });

  it("scores axes from audit evidence", () => {
    const axes = buildMaturityAxes({
      business: { website_url: "https://example.com", raw: {} },
      audit: {
        ...baseAudit,
        response_time_ms: 2500,
        is_https: true,
        detections: {
          hasViewport: { state: "detected" },
          hasTitle: { state: "detected" },
          hasDescription: { state: "not_detected" },
        },
      },
    });

    expect(axes.find((axis) => axis.label === "Adaptação para celular")?.value).toBe(90);
    expect(axes.find((axis) => axis.label === "SEO básico")?.value).toBe(58);
    expect(axes.find((axis) => axis.label === "Velocidade")?.value).toBe(60);
    expect(axes.find((axis) => axis.label === "Confiança (HTTPS)")?.value).toBe(90);
  });

  it("gives every axis a floor value when there is no website at all", () => {
    const axes = buildMaturityAxes({ business: { website_url: null, raw: {} }, audit: null });

    for (const axis of axes.filter((entry) => entry.value !== null)) {
      expect(axis.value).toBeLessThanOrEqual(10);
    }
  });
});
