import { describe, expect, it } from "vitest";
import { buildMaturityAxes, buildReportModel, translateDetection } from "./reports";

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
      title: "Adaptacao para celular",
    });
  });

  it("translates missing viewport into client-facing impact", () => {
    expect(
      translateDetection({ code: "hasViewport", state: "not_detected", audit: null }),
    ).toMatchObject({
      status: "problem",
      title: "Site nao se adapta bem ao celular",
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
      title: "Empresa sem site proprio",
    });
    expect(model.suggestions).toContain("Criacao de site");
    expect(model.maturity.find((axis) => axis.label === "Site proprio")?.value).toBe(10);
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
    expect(titles).toContain("Sem cardapio online proprio");
    // inconclusive nunca vira achado social afirmado
    expect(titles).not.toContain("Presenca concentrada em link-in-bio");
  });

  it("prioritizes problems as alta and suggestions as media", () => {
    const model = buildReportModel({
      business: {
        id: "b1",
        name: "Loja X",
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
        suggested_services: ["Criacao de site moderno"],
        created_at: "2026-07-17T12:00:00Z",
      },
      organizationName: "Agencia",
      senderName: null,
    });

    const altas = model.recommendations.filter((rec) => rec.priority === "alta");
    const medias = model.recommendations.filter((rec) => rec.priority === "media");
    expect(altas.length).toBeGreaterThan(0);
    expect(medias.map((rec) => rec.text)).toContain("Criacao de site moderno");
    // alta sempre vem antes de media
    expect(model.recommendations.findIndex((rec) => rec.priority === "media")).toBeGreaterThan(
      model.recommendations.findIndex((rec) => rec.priority === "alta"),
    );
  });
});

describe("buildMaturityAxes", () => {
  it("marks unaudited axes as null (nao verificado) instead of low score", () => {
    const axes = buildMaturityAxes({
      business: { website_url: "https://example.com" },
      audit: null,
    });

    expect(axes.find((axis) => axis.label === "Site proprio")?.value).toBe(90);
    expect(axes.find((axis) => axis.label === "Adaptacao para celular")?.value).toBeNull();
    expect(axes.find((axis) => axis.label === "Velocidade")?.value).toBeNull();
  });

  it("scores axes from audit evidence", () => {
    const axes = buildMaturityAxes({
      business: { website_url: "https://example.com" },
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

    expect(axes.find((axis) => axis.label === "Adaptacao para celular")?.value).toBe(90);
    expect(axes.find((axis) => axis.label === "SEO basico")?.value).toBe(58);
    expect(axes.find((axis) => axis.label === "Velocidade")?.value).toBe(60);
    expect(axes.find((axis) => axis.label === "Confianca (HTTPS)")?.value).toBe(90);
  });

  it("gives every axis a floor value when there is no website at all", () => {
    const axes = buildMaturityAxes({ business: { website_url: null }, audit: null });

    for (const axis of axes.filter((entry) => entry.value !== null)) {
      expect(axis.value).toBeLessThanOrEqual(10);
    }
  });
});
