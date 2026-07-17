import { TooltipProvider } from "@aypros/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import type { BusinessListItem } from "@aypros/types";
import { describe, expect, it, vi } from "vitest";
import { BusinessesCards } from "./businesses-cards";

const items: BusinessListItem[] = [
  {
    businessId: "b1",
    name: "Padaria Central",
    address: "Rua das Flores, 100",
    city: "Fortaleza",
    state: "CE",
    phone: "+558532241234",
    websiteUrl: "https://padariacentral.com.br",
    socialOnly: false,
    segment: "food_service",
    linkInBio: false,
    deliveryPlatform: true,
    menuOnline: true,
    rating: 4.6,
    reviewCount: 321,
    categories: [],
    score: 62,
    scoreLevel: "high",
    audited: true,
    siteDown: false,
    favorited: false,
    leadId: null,
  },
  {
    businessId: "b2",
    name: "Doceria da Ana",
    address: null,
    city: "Fortaleza",
    state: "CE",
    phone: null,
    websiteUrl: null,
    socialOnly: true,
    segment: "food_service",
    linkInBio: true,
    deliveryPlatform: false,
    menuOnline: false,
    rating: null,
    reviewCount: null,
    categories: [],
    score: null,
    scoreLevel: null,
    audited: false,
    siteDown: false,
    favorited: true,
    leadId: "lead-2",
  },
];

function renderCards(overrides: Partial<Parameters<typeof BusinessesCards>[0]> = {}) {
  const handlers = {
    onSelectionChange: vi.fn(),
    onToggleFavorite: vi.fn(),
    onAudit: vi.fn(),
    onAddToPipeline: vi.fn(),
  };
  render(
    <TooltipProvider>
      <BusinessesCards
        items={items}
        selectedIds={new Set()}
        favoritePendingId={null}
        auditPendingId={null}
        pipelinePendingId={null}
        {...handlers}
        {...overrides}
      />
    </TooltipProvider>,
  );
  return handlers;
}

describe("BusinessesCards", () => {
  it("renders one card per business with name link and score badge", () => {
    renderCards();

    expect(screen.getByRole("link", { name: "Padaria Central" })).toHaveAttribute(
      "href",
      "/businesses/b1",
    );
    expect(screen.getByText("Social apenas")).toBeInTheDocument();
    expect(screen.getByLabelText(/oportunidade alta.*score 62/i)).toBeInTheDocument();
  });

  it("calls onSelectionChange when a card checkbox is toggled", () => {
    const { onSelectionChange } = renderCards();

    fireEvent.click(screen.getByLabelText("Selecionar Padaria Central"));

    expect(onSelectionChange).toHaveBeenCalledWith(["b1"], true);
  });

  it("calls onToggleFavorite from the card action", () => {
    const { onToggleFavorite } = renderCards();

    fireEvent.click(screen.getByLabelText("Favoritar"));

    expect(onToggleFavorite).toHaveBeenCalledWith(items[0]);
  });

  it("disables the audit action for businesses without a website", () => {
    renderCards();

    const auditButtons = screen.getAllByLabelText("Auditar site");
    expect(auditButtons[1]).toBeDisabled();
  });

  it("calls onAddToPipeline from the card action", () => {
    const { onAddToPipeline } = renderCards();

    fireEvent.click(screen.getByLabelText("Adicionar ao pipeline"));

    expect(onAddToPipeline).toHaveBeenCalledWith("b1");
  });

  it("links to the pipeline detail for a business already in it", () => {
    renderCards();

    expect(screen.getByRole("link", { name: "Ver no pipeline" })).toHaveAttribute(
      "href",
      "/pipeline/lead-2",
    );
  });
});
