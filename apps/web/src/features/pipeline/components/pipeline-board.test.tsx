import type { LeadSummary } from "@aypros/types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    render(<PipelineBoard leads={[makeLead()]} onMove={vi.fn()} movePendingLeadId={null} />);

    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("Contactado")).toBeInTheDocument();
    expect(screen.getByText("Em conversa")).toBeInTheDocument();
    expect(screen.getByText("Proposta enviada")).toBeInTheDocument();
    expect(screen.getByText("Ganho")).toBeInTheDocument();
    expect(screen.getByText("Perdido")).toBeInTheDocument();
  });

  it("moves a lead to a non-terminal stage immediately, without confirmation", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<PipelineBoard leads={[makeLead()]} onMove={onMove} movePendingLeadId={null} />);

    await user.click(screen.getByLabelText("Mover Padaria Central"));
    await user.click(await screen.findByRole("menuitem", { name: "Contactado" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onMove).toHaveBeenCalledWith("l1", "contacted", 0);
  });

  it("asks for confirmation before moving a lead to won, and only calls onMove after confirming", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<PipelineBoard leads={[makeLead()]} onMove={onMove} movePendingLeadId={null} />);

    await user.click(screen.getByLabelText("Mover Padaria Central"));
    await user.click(await screen.findByRole("menuitem", { name: "Ganho" }));

    expect(onMove).not.toHaveBeenCalled();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/marcar como ganho/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));

    expect(onMove).toHaveBeenCalledWith("l1", "won", 0);
  });

  it("does not move the lead when the won/lost confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<PipelineBoard leads={[makeLead()]} onMove={onMove} movePendingLeadId={null} />);

    await user.click(screen.getByLabelText("Mover Padaria Central"));
    await user.click(await screen.findByRole("menuitem", { name: "Perdido" }));
    await user.click(await screen.findByRole("button", { name: "Cancelar" }));

    expect(onMove).not.toHaveBeenCalled();
  });
});
