import { TooltipProvider } from "@aypros/ui";
import type { LeadSummary } from "@aypros/types";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SortableLeadCard } from "./lead-card";

function makeLead(overrides: Partial<LeadSummary> = {}): LeadSummary {
  return {
    id: "l1",
    businessId: "b1",
    businessName: "Padaria Central",
    city: "Fortaleza",
    state: "CE",
    websiteUrl: null,
    stage: "new",
    status: "active",
    potentialValue: 1200,
    nextAction: "Ligar",
    nextActionAt: null,
    lastContactAt: null,
    position: 0,
    score: 62,
    scoreLevel: "high",
    assignedTo: "u1",
    assignedToName: "Rayssa Alves",
    assignedToAvatarUrl: null,
    createdAt: "2026-07-16T12:00:00Z",
    ...overrides,
  };
}

function renderCard(lead: LeadSummary) {
  render(
    <TooltipProvider>
      <DndContext onDragEnd={vi.fn()}>
        <SortableContext items={[lead.id]}>
          <SortableLeadCard lead={lead} />
        </SortableContext>
      </DndContext>
    </TooltipProvider>,
  );
}

describe("SortableLeadCard", () => {
  it("renders the business name, score and potential value", () => {
    renderCard(makeLead());

    expect(screen.getByRole("link", { name: "Padaria Central" })).toHaveAttribute(
      "href",
      "/pipeline/l1",
    );
    expect(screen.getByLabelText(/oportunidade alta.*score 62/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.200/)).toBeInTheDocument();
    expect(screen.getByText("RA")).toBeInTheDocument();
  });

  it("highlights an overdue next action", () => {
    renderCard(makeLead({ nextActionAt: "2020-01-01T00:00:00Z" }));

    const dueText = screen.getByText(/Ligar/);
    expect(dueText.className).toContain("text-destructive");
  });

  it("exposes drag, open and remove actions without the old stage menu", () => {
    renderCard(makeLead());

    expect(screen.getByLabelText("Arrastar Padaria Central")).toBeInTheDocument();
    expect(screen.getByLabelText("Abrir Padaria Central")).toHaveAttribute("href", "/pipeline/l1");
    expect(screen.getByLabelText("Remover Padaria Central do pipeline")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mover Padaria Central")).not.toBeInTheDocument();
  });
});
