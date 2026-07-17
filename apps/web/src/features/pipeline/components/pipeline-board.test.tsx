import type { LeadSummary } from "@aypros/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PipelineBoard } from "./pipeline-board";

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
    lastContactAt: null,
    position: 0,
    score: null,
    scoreLevel: null,
    assignedTo: null,
    assignedToName: null,
    assignedToAvatarUrl: null,
    createdAt: "2026-07-16T12:00:00Z",
    ...overrides,
  };
}

describe("PipelineBoard", () => {
  it("renders every fixed stage as a column", () => {
    render(<PipelineBoard leads={[makeLead()]} onMove={vi.fn()} />);

    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("Contactado")).toBeInTheDocument();
    expect(screen.getByText("Em conversa")).toBeInTheDocument();
    expect(screen.getByText("Proposta enviada")).toBeInTheDocument();
    expect(screen.getByText("Ganho")).toBeInTheDocument();
    expect(screen.getByText("Perdido")).toBeInTheDocument();
  });

  it("has a keyboard-focusable drag handle and no three-dots move menu on the card", () => {
    render(<PipelineBoard leads={[makeLead()]} onMove={vi.fn()} />);

    expect(screen.getByLabelText("Arrastar Padaria Central")).toBeInTheDocument();
    // The stage-move dropdown was removed in Phase 17 — drag (pointer or
    // keyboard via the handle) and the detail page are the ways to move.
    expect(screen.queryByLabelText("Mover Padaria Central")).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
