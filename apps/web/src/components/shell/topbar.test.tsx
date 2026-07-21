import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Topbar } from "./topbar";

const pathnameState = vi.hoisted(() => ({ value: "/dashboard" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
}));

vi.mock("@/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Tema</button>,
}));

vi.mock("./user-menu", () => ({
  UserMenu: () => <button type="button">Conta</button>,
}));

describe("Topbar", () => {
  it("shows the organization name on top-level pages", () => {
    pathnameState.value = "/dashboard";

    render(<Topbar user={{ email: "user@example.com", fullName: "User" }} organization={{ name: "pqray", slug: "pqray" }} />);

    expect(screen.getByText("pqray")).toBeInTheDocument();
  });

  it("keeps the organization name visible on nested pages", () => {
    pathnameState.value = "/ayhub/sites/site-1";

    render(<Topbar user={{ email: "user@example.com", fullName: "User" }} organization={{ name: "pqray", slug: "pqray" }} />);

    expect(screen.getByText("pqray")).toBeInTheDocument();
    expect(screen.getByLabelText("Breadcrumb")).toBeInTheDocument();
  });
});
