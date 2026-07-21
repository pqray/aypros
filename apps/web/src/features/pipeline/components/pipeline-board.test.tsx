import { TooltipProvider } from "@aypros/ui";
import type { LeadSummary } from "@aypros/types";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
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
    domainCostAnnual: 40,
    hostingCostMonthly: 35,
    marginTargetPercent: null,
    estimatedMonthlyCost: null,
    suggestedMaintenanceValue: null,
    lostReason: null,
    createdAt: "2026-07-16T12:00:00Z",
    ...overrides,
  };
}

function renderBoard(props: Partial<ComponentProps<typeof PipelineBoard>> = {}) {
  const defaultProps: ComponentProps<typeof PipelineBoard> = {
    leads: [makeLead()],
    onMove: vi.fn(),
  };

  return render(
    <TooltipProvider>
      <PipelineBoard {...defaultProps} {...props} />
    </TooltipProvider>,
  );
}

describe("PipelineBoard", () => {
  it("renders every fixed stage as a column", () => {
    renderBoard();

    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("Contactado")).toBeInTheDocument();
    expect(screen.getByText("Em conversa")).toBeInTheDocument();
    expect(screen.getByText("Proposta enviada")).toBeInTheDocument();
    expect(screen.getByText("Ganho")).toBeInTheDocument();
    expect(screen.getByText("Perdido")).toBeInTheDocument();
  });

  it("has visible card actions and no three-dots move menu on the card", () => {
    renderBoard();

    expect(screen.getByLabelText("Arrastar Padaria Central")).toBeInTheDocument();
    expect(screen.getByLabelText("Abrir Padaria Central")).toHaveAttribute("href", "/pipeline/l1");
    expect(screen.getByLabelText("Remover Padaria Central do pipeline")).toBeInTheDocument();
    expect(screen.queryByLabelText("Mover Padaria Central")).not.toBeInTheDocument();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("confirms removal from the card", () => {
    const onRemoveLead = vi.fn();
    renderBoard({ onRemoveLead });

    fireEvent.click(screen.getByLabelText("Remover Padaria Central do pipeline"));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));

    expect(onRemoveLead).toHaveBeenCalledWith("l1");
  });
});
