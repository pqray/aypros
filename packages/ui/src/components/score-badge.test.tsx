import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScoreBadge } from "./score-badge";

describe("ScoreBadge", () => {
  it.each([
    ["low", "Baixa", "text-opportunity-low"],
    ["medium", "Média", "text-opportunity-medium"],
    ["high", "Alta", "text-opportunity-high"],
    ["very_high", "Muito alta", "text-opportunity-very-high"],
  ] as const)("renders level %s with label and token class", (level, label, tokenClass) => {
    render(<ScoreBadge level={level} score={50} />);
    const badge = screen.getByText(label).closest("span[aria-label]");
    expect(badge).not.toBeNull();
    expect(badge!.className).toContain(tokenClass);
  });

  it("shows the score when provided", () => {
    render(<ScoreBadge level="high" score={71} />);
    expect(screen.getByText("71")).toBeInTheDocument();
  });

  it("has an accessible aria-label including the score", () => {
    render(<ScoreBadge level="very_high" score={93} />);
    expect(screen.getByLabelText("Oportunidade muito alta, score 93")).toBeInTheDocument();
  });

  it("hides the label when showLabel is false", () => {
    render(<ScoreBadge level="low" score={10} showLabel={false} />);
    expect(screen.queryByText("Baixa")).not.toBeInTheDocument();
  });
});
