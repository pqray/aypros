import { TooltipProvider } from "@aypros/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessDetailView } from "./business-detail-view";

function renderView(businessId: string) {
  return render(
    <TooltipProvider>
      <BusinessDetailView businessId={businessId} />
    </TooltipProvider>,
  );
}

const mutate = vi.fn();
const refreshMutate = vi.fn();
const toggleFavoriteMutate = vi.fn();
const createLeadMutate = vi.fn();

vi.mock("@/components/shell/use-app-context", () => ({
  useAppContext: () => ({ data: { organization: { id: "org1" } } }),
}));

vi.mock("@/features/pipeline/queries", () => ({
  useCreateLead: () => ({ mutate: createLeadMutate, isPending: false }),
}));

vi.mock("@/features/ai/components/ai-generations-card", () => ({
  AiGenerationsCard: () => <div data-testid="ai-generations-card" />,
}));

vi.mock("@/lib/use-tab-param", () => ({
  useTabParam: (_param: string, defaultValue: string) => useState(defaultValue),
}));

vi.mock("../queries", () => ({
  useBusinessAuditSummary: () => ({
    isLoading: false,
    data: {
      business: {
        id: "b1",
        name: "Padaria Central",
        address: "Rua das Flores, 100",
        city: "Fortaleza",
        state: "CE",
        phone: "+558532241234",
        websiteUrl: "https://padaria.example",
        rating: 4.6,
        reviewCount: 120,
        categories: [],
        segment: "food_service",
        socialOnly: false,
        socialPlatform: null,
      },
      latestAudit: {
        id: "a1",
        status: "completed",
        finalUrl: "https://padaria.example",
        httpStatus: 200,
        responseTimeMs: 250,
        redirectCount: 1,
        isHttps: true,
        detections: {
          hasViewport: { state: "detected" },
          hasTitle: { state: "detected" },
          hasDescription: { state: "not_detected" },
          outdated: { state: "not_detected" },
          siteDown: { state: "not_detected" },
          basicBuilder: { state: "not_detected" },
          instagram: { state: "detected", evidence: { links: ["https://instagram.com/padaria"] } },
          socialLinks: { state: "detected", evidence: { links: ["https://instagram.com/padaria"] } },
          linkInBio: { state: "not_detected" },
          deliveryPlatform: { state: "detected", evidence: { id: "ifood" } },
          menuOnline: { state: "not_detected" },
        },
        evidence: {},
        errorCode: null,
        createdAt: "2026-07-16T12:00:00Z",
        completedAt: "2026-07-16T12:00:01Z",
      },
      latestScore: {
        id: "s1",
        auditId: "a1",
        score: 43,
        level: "medium",
        confidence: "high",
        reasons: [{ code: "weak_metadata", label: "Sem title/description adequados", impact: 8 }],
        suggestedServices: ["SEO local"],
        algorithmVersion: "v1",
        createdAt: "2026-07-16T12:00:01Z",
      },
      refreshedAt: "2026-07-16T12:00:01Z",
      providerStatus: "active",
      favorited: false,
      leadId: null,
    },
  }),
  useRunBusinessAudit: () => ({ mutate, isPending: false }),
  useRefreshBusinessData: () => ({ mutate: refreshMutate, isPending: false }),
  useToggleFavorite: () => ({ mutate: toggleFavoriteMutate, isPending: false }),
  useBusinessReport: () => ({
    isLoading: false,
    data: {
      summary: "Diagnóstico consultivo da presença digital.",
      httpStatusNote: "Site respondeu com HTTP 200.",
      findings: [
        {
          title: "Metadados incompletos",
          body: "A página não tem description adequada.",
          impact: "Isso pode reduzir a clareza no Google.",
          status: "problem",
        },
      ],
      recommendations: [{ priority: "alta", text: "Revisar title e description." }],
      nextSteps: ["Priorizar SEO local."],
      maturity: [
        { label: "Site", value: 80 },
        { label: "SEO básico", value: 45 },
      ],
    },
  }),
}));

describe("BusinessDetailView", () => {
  beforeEach(() => {
    mutate.mockClear();
    refreshMutate.mockClear();
    toggleFavoriteMutate.mockClear();
    createLeadMutate.mockClear();
  });

  it("runs a data refresh from the action menu", async () => {
    const user = userEvent.setup();
    renderView("b1");

    await user.click(screen.getByRole("button", { name: /mais/i }));
    await user.click(screen.getByRole("menuitem", { name: /atualizar dados/i }));

    expect(refreshMutate).toHaveBeenCalled();
  });

  it("shows digital presence in the overview tab and audit/score in the metrics tab", async () => {
    const user = userEvent.setup();
    renderView("b1");

    expect(screen.getByText("Padaria Central")).toBeTruthy();
    // Visão geral (tab default): presença digital com sinais de segmento.
    expect(screen.getByText("Plataforma de delivery")).toBeTruthy();
    expect(screen.getByText("Sem cardápio online")).toBeTruthy();

    await user.click(screen.getByRole("tab", { name: "Métricas" }));

    expect(await screen.findByText("Potencial da oportunidade")).toBeTruthy();
    expect(screen.getByLabelText(/score 43 de 100/i)).toBeTruthy();
    expect(screen.getByText("Maturidade digital")).toBeTruthy();
    expect(screen.getByLabelText(/SEO básico: 45 de 100/i)).toBeTruthy();
    expect(screen.getByText("Sem title/description adequados")).toBeTruthy();
  });

  it("runs a new audit from the action button", () => {
    renderView("b1");

    fireEvent.click(screen.getByRole("button", { name: /reanalisar/i }));

    expect(mutate).toHaveBeenCalled();
  });

  it("favorites the business from the action menu", async () => {
    const user = userEvent.setup();
    renderView("b1");

    await user.click(screen.getByRole("button", { name: /mais/i }));
    await user.click(screen.getByRole("menuitem", { name: /^favoritar$/i }));

    expect(toggleFavoriteMutate).toHaveBeenCalledWith(
      { businessId: "b1", favorited: true },
      expect.anything(),
    );
  });

  it("adds the business to the pipeline from the action menu", async () => {
    const user = userEvent.setup();
    renderView("b1");

    await user.click(screen.getByRole("button", { name: /mais/i }));
    await user.click(screen.getByRole("menuitem", { name: /adicionar ao pipeline/i }));

    expect(createLeadMutate).toHaveBeenCalledWith("b1", expect.anything());
  });
});
