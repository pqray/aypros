import { TooltipProvider } from "@aypros/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BusinessListItem } from "@aypros/types";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { BusinessesTable } from "./businesses-table";

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

function renderTable(overrides: Partial<ComponentProps<typeof BusinessesTable>> = {}) {
  const handlers = {
    onSelectionChange: vi.fn(),
    onToggleFavorite: vi.fn(),
    onAudit: vi.fn(),
    onAddToPipeline: vi.fn(),
    onSortChange: vi.fn(),
    onWebsiteFilterChange: vi.fn(),
  };
  render(
    <TooltipProvider>
      <BusinessesTable
        items={items}
        selectedIds={new Set()}
        favoritePendingId={null}
        auditPendingId={null}
        pipelinePendingId={null}
        sortBy="name"
        sortDir="asc"
        websiteFilter="all"
        {...handlers}
        {...overrides}
      />
    </TooltipProvider>,
  );
  return handlers;
}

describe("BusinessesTable", () => {
  it("renders rows with name link, website badge and score badge", () => {
    renderTable();

    expect(screen.getByRole("link", { name: "Padaria Central" })).toHaveAttribute(
      "href",
      "/businesses/b1",
    );
    expect(screen.getByText("Social apenas")).toBeInTheDocument();
    expect(screen.getByLabelText(/oportunidade alta.*score 62/i)).toBeInTheDocument();
  });

  it("calls onSelectionChange when a row checkbox is toggled", () => {
    const { onSelectionChange } = renderTable();

    fireEvent.click(screen.getByLabelText("Selecionar Padaria Central"));

    expect(onSelectionChange).toHaveBeenCalledWith(["b1"], true);
  });

  it("calls onToggleFavorite from the row action", () => {
    const { onToggleFavorite } = renderTable();

    fireEvent.click(screen.getByLabelText("Favoritar"));

    expect(onToggleFavorite).toHaveBeenCalledWith(items[0]);
  });

  it("disables the audit action for businesses without a website", () => {
    renderTable();

    const auditButtons = screen.getAllByLabelText("Auditar site");
    expect(auditButtons[1]).toBeDisabled();
  });

  it("calls onAddToPipeline for a business not yet in the pipeline", () => {
    const { onAddToPipeline } = renderTable();

    fireEvent.click(screen.getByLabelText("Adicionar ao pipeline"));

    expect(onAddToPipeline).toHaveBeenCalledWith("b1");
  });

  it("links to the pipeline detail for a business already in it", () => {
    renderTable();

    expect(screen.getByRole("link", { name: "Ver no pipeline" })).toHaveAttribute(
      "href",
      "/pipeline/lead-2",
    );
  });

  it("filters by website from the Site column header", async () => {
    const user = userEvent.setup();
    const { onWebsiteFilterChange } = renderTable();

    await user.click(screen.getByRole("button", { name: "Site" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Sem site" }));

    expect(onWebsiteFilterChange).toHaveBeenCalledWith("without_site");
  });
});
