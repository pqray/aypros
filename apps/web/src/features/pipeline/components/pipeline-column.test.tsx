import type { LeadSummary } from "@aypros/types";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { describe, expect, it, vi } from "vitest";
import { PipelineColumn } from "./pipeline-column";

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
    potentialValue: null,
    nextAction: null,
    nextActionAt: null,
    position: 0,
    score: null,
    scoreLevel: null,
    createdAt: "2026-07-16T12:00:00Z",
    ...overrides,
  };
}

function renderColumn(leads: LeadSummary[]) {
  return render(
    <DndContext onDragEnd={vi.fn()}>
      <PipelineColumn
        column={{
          stage: "new",
          leads,
          count: leads.length,
          totalValue: leads.reduce((sum, lead) => sum + (lead.potentialValue ?? 0), 0),
        }}
        onMove={vi.fn()}
        movePendingLeadId={null}
      />
    </DndContext>,
  );
}

describe("PipelineColumn", () => {
  it("renders the stage label, count and each lead card", () => {
    renderColumn([makeLead({ id: "a", businessName: "Padaria Central" }), makeLead({ id: "b", businessName: "Doceria da Ana" })]);

    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("2 leads")).toBeInTheDocument();
    expect(screen.getByText("Padaria Central")).toBeInTheDocument();
    expect(screen.getByText("Doceria da Ana")).toBeInTheDocument();
  });

  it("sums potential value into the header", () => {
    renderColumn([makeLead({ potentialValue: 1500 })]);

    // Header uses maximumFractionDigits:0 ("R$ 1.500", no comma); the card's own
    // value display keeps cents ("R$ 1.500,00") — disambiguate on the comma.
    expect(
      screen.getByText((content) => content.includes("1.500") && !content.includes(",")),
    ).toBeInTheDocument();
  });

  it("shows an empty state for a column with no leads", () => {
    renderColumn([]);

    expect(screen.getByText("0 leads")).toBeInTheDocument();
    expect(screen.getByText("Nenhum lead aqui")).toBeInTheDocument();
  });

  it("uses the singular form for exactly one lead", () => {
    renderColumn([makeLead()]);

    expect(screen.getByText("1 lead")).toBeInTheDocument();
  });
});
