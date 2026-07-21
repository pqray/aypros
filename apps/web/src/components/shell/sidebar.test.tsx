import { TooltipProvider } from "@aypros/ui";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Sidebar } from "./sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

function renderSidebar() {
  return render(
    <TooltipProvider>
      <Sidebar
        user={{ email: "user@example.com", fullName: "User" }}
        organization={{ name: "pqray", slug: "pqray" }}
      />
    </TooltipProvider>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    useSidebarStore.setState({ mobileOpen: false });
  });

  it("marks the active navigation item", () => {
    renderSidebar();

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("aria-current", "page");
  });

  it("shows the Aypros brand instead of the organization name", () => {
    renderSidebar();

    expect(screen.getAllByRole("link", { name: "Aypros" }).length).toBeGreaterThan(0);
    expect(screen.queryByText("pqray")).not.toBeInTheDocument();
  });

  it("stays compact by default and expands on hover", () => {
    renderSidebar();

    const sidebar = screen.getByLabelText(/navegacao lateral/i);
    expect(sidebar).toHaveClass("w-16");
    expect(screen.queryByRole("button", { name: /expandir|recolher/i })).not.toBeInTheDocument();

    fireEvent.mouseEnter(sidebar);

    expect(sidebar).toHaveClass("w-64");
    expect(screen.getByText("Aypros")).toBeInTheDocument();

    fireEvent.mouseLeave(sidebar);

    expect(sidebar).toHaveClass("w-16");
  });

  it("keeps profile and organization settings out of the sidebar", () => {
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Perfil" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Organização" })).not.toBeInTheDocument();
  });
});
