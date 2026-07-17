import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BusinessCard } from "./business-card";

describe("BusinessCard", () => {
  it("renders the title, meta, badges and actions slots", () => {
    render(
      <BusinessCard
        name="Padaria Central"
        websiteUrl={null}
        title={<a href="/businesses/b1">Padaria Central</a>}
        meta={<p>Fortaleza/CE</p>}
        badges={<span>Sem site</span>}
        actions={<button type="button">Favoritar</button>}
      />,
    );

    expect(screen.getByRole("link", { name: "Padaria Central" })).toBeInTheDocument();
    expect(screen.getByText("Fortaleza/CE")).toBeInTheDocument();
    expect(screen.getByText("Sem site")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Favoritar" })).toBeInTheDocument();
  });

  it("renders the leading slot before the logo", () => {
    render(
      <BusinessCard
        name="Padaria Central"
        websiteUrl={null}
        title="Padaria Central"
        leading={<span data-testid="leading-slot">*</span>}
      />,
    );

    expect(screen.getByTestId("leading-slot")).toBeInTheDocument();
  });

  it("omits the badges row entirely when no badges are given", () => {
    const { container } = render(
      <BusinessCard name="Padaria Central" websiteUrl={null} title="Padaria Central" />,
    );

    expect(container.querySelector(".mt-auto")).toBeNull();
  });
});
