import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BusinessLogo } from "./business-logo";

describe("BusinessLogo", () => {
  it("shows two-letter initials from the business name as a fallback", () => {
    render(<BusinessLogo name="Padaria Central" websiteUrl={null} />);

    expect(screen.getByText("PC")).toBeInTheDocument();
  });

  it("shows first two letters for single-word names", () => {
    render(<BusinessLogo name="Amazonia" websiteUrl={null} />);

    expect(screen.getByText("AM")).toBeInTheDocument();
  });

  it("falls back to '?' for an empty name", () => {
    render(<BusinessLogo name="   " websiteUrl={null} />);

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("does not crash on an invalid website URL", () => {
    render(<BusinessLogo name="Padaria Central" websiteUrl="not-a-url" />);

    expect(screen.getByText("PC")).toBeInTheDocument();
  });
});
