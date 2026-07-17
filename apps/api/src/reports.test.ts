import { describe, expect, it } from "vitest";
import { buildReportModel, translateDetection } from "./reports";

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
  });
});
