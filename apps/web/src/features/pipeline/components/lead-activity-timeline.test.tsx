import type { LeadActivity } from "@aypros/types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LeadActivityTimeline } from "./lead-activity-timeline";

describe("LeadActivityTimeline", () => {
  it("shows an honest empty state when there is no history yet", () => {
    render(<LeadActivityTimeline activities={[]} />);

    expect(screen.getByText("Nenhuma atividade ainda")).toBeInTheDocument();
  });

  it("renders each activity with its label", () => {
    const activities: LeadActivity[] = [
      {
        id: "a1",
        type: "lead_created",
        payload: { business_name: "Padaria Central" },
        createdAt: "2026-07-16T12:00:00Z",
      },
      {
        id: "a2",
        type: "note_created",
        payload: {},
        createdAt: "2026-07-16T13:00:00Z",
      },
    ];

    render(<LeadActivityTimeline activities={activities} />);

    expect(screen.getByText("Lead adicionado ao pipeline")).toBeInTheDocument();
    expect(screen.getByText("Nota criada")).toBeInTheDocument();
  });

  it("shows the from/to detail for a stage-change activity", () => {
    const activities: LeadActivity[] = [
      {
        id: "a1",
        type: "lead_stage_changed",
        payload: { from: "new", to: "contacted", from_label: "Novo", to_label: "Contactado" },
        createdAt: "2026-07-16T12:00:00Z",
      },
    ];

    render(<LeadActivityTimeline activities={activities} />);

    expect(screen.getByText("Novo → Contactado")).toBeInTheDocument();
  });
});
