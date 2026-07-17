import type { LeadSummary } from "@aypros/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
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
    position: 0,
    score: 62,
    scoreLevel: "high",
    createdAt: "2026-07-16T12:00:00Z",
    ...overrides,
  };
}

function renderCard(lead: LeadSummary, onMove = vi.fn()) {
  render(
    <DndContext onDragEnd={vi.fn()}>
      <SortableContext items={[lead.id]}>
        <SortableLeadCard lead={lead} onMove={onMove} movePending={false} />
      </SortableContext>
    </DndContext>,
  );
  return onMove;
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
  });

  it("highlights an overdue next action", () => {
    renderCard(makeLead({ nextActionAt: "2020-01-01T00:00:00Z" }));

    const dueText = screen.getByText(/Ligar/);
    expect(dueText.className).toContain("text-destructive");
  });

  it("moves the lead to another stage via the accessible menu", async () => {
    const user = userEvent.setup();
    const onMove = renderCard(makeLead());

    await user.click(screen.getByLabelText("Mover Padaria Central"));
    await user.click(await screen.findByRole("menuitem", { name: "Contactado" }));

    expect(onMove).toHaveBeenCalledWith("l1", "contacted");
  });

  it("does not offer the lead's current stage as a move target", async () => {
    const user = userEvent.setup();
    renderCard(makeLead({ stage: "new" }));

    await user.click(screen.getByLabelText("Mover Padaria Central"));

    expect(await screen.findByText("Contactado")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Novo" })).not.toBeInTheDocument();
  });
});
