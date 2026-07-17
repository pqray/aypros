import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QuickSearchForm } from "./quick-search-form";

const push = vi.fn();
const mutate = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/shell/use-app-context", () => ({
  useAppContext: () => ({ data: { organization: { id: "org1" } } }),
}));

vi.mock("@/features/discovery/queries", () => ({
  useCreateSearch: () => ({ mutate, isPending: false }),
}));

vi.mock("@/features/discovery/ibge", () => ({
  BR_STATES: [
    { uf: "CE", name: "Ceara" },
    { uf: "RJ", name: "Rio de Janeiro" },
  ],
  useCitiesByUf: () => ({ data: [], isLoading: false }),
}));

describe("QuickSearchForm", () => {
  beforeEach(() => {
    push.mockClear();
    mutate.mockClear();
  });

  it("creates a search and redirects to its results", async () => {
    mutate.mockImplementation((_values, options) => {
      options.onSuccess({ search: { id: "search1" }, reused: false });
    });
    render(<QuickSearchForm />);

    fireEvent.change(screen.getByLabelText(/cidade/i), { target: { value: "Fortaleza" } });
    fireEvent.change(screen.getByLabelText(/segmento/i), { target: { value: "Restaurantes" } });
    fireEvent.click(screen.getByRole("button", { name: /buscar empresas/i }));

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Fortaleza", segment: "Restaurantes" }),
        expect.any(Object),
      );
      expect(push).toHaveBeenCalledWith("/discovery?search=search1");
    });
  });

  it("renders the UF selector before city", () => {
    render(<QuickSearchForm />);

    expect(screen.getByText("UF")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /uf/i })).toBeInTheDocument();
  });

  it("shows segment suggestions in the app dropdown style", () => {
    render(<QuickSearchForm />);

    const segmentInput = screen.getByLabelText(/segmento/i);
    fireEvent.focus(segmentInput);

    expect(screen.getByRole("option", { name: "Dentista" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Restaurante" })).toBeInTheDocument();
  });

  it("shows validation errors and does not redirect when fields are empty", async () => {
    render(<QuickSearchForm />);

    fireEvent.click(screen.getByRole("button", { name: /buscar empresas/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/deve ter pelo menos/i).length).toBeGreaterThan(0);
    });
    expect(mutate).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
});
