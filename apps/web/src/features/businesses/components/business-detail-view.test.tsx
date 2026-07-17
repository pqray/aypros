import { TooltipProvider } from "@aypros/ui";
import { fireEvent, render, screen } from "@testing-library/react";
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
      favorited: false,
      leadId: null,
    },
  }),
  useRunBusinessAudit: () => ({ mutate, isPending: false }),
  useToggleFavorite: () => ({ mutate: toggleFavoriteMutate, isPending: false }),
}));

describe("BusinessDetailView", () => {
  beforeEach(() => {
    mutate.mockClear();
    toggleFavoriteMutate.mockClear();
    createLeadMutate.mockClear();
  });

  it("renders latest audit and score summary", () => {
    renderView("b1");

    expect(screen.getByText("Padaria Central")).toBeTruthy();
    expect(screen.getByText("Auditoria HTTP")).toBeTruthy();
    expect(screen.getByLabelText(/oportunidade.*score 43/i)).toBeTruthy();
    expect(screen.getByText("Sem title/description adequados")).toBeTruthy();
  });

  it("runs a new audit from the action button", () => {
    renderView("b1");

    fireEvent.click(screen.getByRole("button", { name: /reanalisar/i }));

    expect(mutate).toHaveBeenCalled();
  });

  it("favorites the business from the action button", () => {
    renderView("b1");

    fireEvent.click(screen.getByRole("button", { name: /^favoritar$/i }));

    expect(toggleFavoriteMutate).toHaveBeenCalledWith(
      { businessId: "b1", favorited: true },
      expect.anything(),
    );
  });

  it("adds the business to the pipeline from the action button", () => {
    renderView("b1");

    fireEvent.click(screen.getByRole("button", { name: /adicionar ao pipeline/i }));

    expect(createLeadMutate).toHaveBeenCalledWith("b1", expect.anything());
  });
});
