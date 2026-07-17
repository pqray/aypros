import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PiHeart } from "react-icons/pi";
import { Button } from "./button";

describe("Button", () => {
  it("renders each variant with its token classes", () => {
    const { rerender } = render(<Button>Ação</Button>);
    expect(screen.getByRole("button").className).toContain("bg-primary");

    rerender(<Button variant="destructive">Ação</Button>);
    expect(screen.getByRole("button").className).toContain("bg-destructive");

    rerender(<Button variant="outline">Ação</Button>);
    expect(screen.getByRole("button").className).toContain("border-input");
  });

  it("is disabled while loading", () => {
    render(<Button loading>Salvando</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("replaces icon-only content with a spinner while loading", () => {
    render(
      <Button size="icon" loading aria-label="Favoritar">
        <PiHeart data-testid="heart-icon" />
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Favoritar" })).toBeDisabled();
    expect(screen.queryByTestId("heart-icon")).not.toBeInTheDocument();
  });

  it("renders as child element with asChild", () => {
    render(
      <Button asChild>
        <a href="/x">Ir</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Ir" })).toBeInTheDocument();
  });
});
