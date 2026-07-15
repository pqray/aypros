import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(<EmptyState title="Nenhuma pesquisa ainda" description="Busque empresas." />);
    expect(screen.getByText("Nenhuma pesquisa ainda")).toBeInTheDocument();
    expect(screen.getByText("Busque empresas.")).toBeInTheDocument();
  });

  it("renders the action when provided", () => {
    render(<EmptyState title="Vazio" action={<button>Nova pesquisa</button>} />);
    expect(screen.getByRole("button", { name: "Nova pesquisa" })).toBeInTheDocument();
  });

  it("omits optional parts when not provided", () => {
    render(<EmptyState title="Somente título" />);
    expect(screen.getByText("Somente título")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
