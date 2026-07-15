import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

  it("renders as child element with asChild", () => {
    render(
      <Button asChild>
        <a href="/x">Ir</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Ir" })).toBeInTheDocument();
  });
});
