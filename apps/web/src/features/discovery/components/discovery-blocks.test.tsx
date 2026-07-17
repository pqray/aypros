import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import type { SearchResultsResponse, SearchSummary } from "@aypros/types";
import { SearchProgress } from "./search-progress";
import { SearchResultsList } from "./search-results-list";

function makeSearch(overrides: Partial<SearchSummary> = {}): SearchSummary {
  return {
    id: "s1",
    city: "Fortaleza",
    state: "CE",
    segment: "Padarias",
    status: "processing",
    totalFound: 12,
    errorMessage: null,
    provider: "google_places",
    createdAt: "2026-07-16T12:00:00Z",
    ...overrides,
  };
}

describe("SearchProgress", () => {
  it("shows status and count while processing, without retry", () => {
    render(<SearchProgress search={makeSearch()} onRetry={vi.fn()} retrying={false} />);

    expect(screen.getByText("Processando")).toBeInTheDocument();
    expect(screen.getByText(/12 empresas encontradas/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tentar novamente/i })).not.toBeInTheDocument();
  });

  it("shows error message and retry button when failed", () => {
    const onRetry = vi.fn();
    render(
      <SearchProgress
        search={makeSearch({ status: "failed", totalFound: 0, errorMessage: "Cota esgotada" })}
        onRetry={onRetry}
        retrying={false}
      />,
    );

    expect(screen.getByText("Falhou")).toBeInTheDocument();
    expect(screen.getByText("Cota esgotada")).toBeInTheDocument();
    screen.getByRole("button", { name: /tentar novamente/i }).click();
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("SearchResultsList", () => {
  const listHandlers = {
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
    onFilterChange: vi.fn(),
    onSortChange: vi.fn(),
    onViewChange: vi.fn(),
    onToggleFavorite: vi.fn(),
  };

  const results: SearchResultsResponse = {
    page: 1,
    pageSize: 10,
    total: 2,
    items: [
      {
        businessId: "b1",
        position: 1,
        name: "Padaria Central",
        address: "Rua das Flores, 100",
        city: "Fortaleza",
        state: "CE",
        phone: "+558532241234",
        websiteUrl: "https://padariacentral.com.br/",
        rating: 4.6,
        reviewCount: 321,
        categories: ["bakery"],
        favorited: false,
      },
      {
        businessId: "b2",
        position: 2,
        name: "Doceria da Ana",
        address: null,
        city: "Fortaleza",
        state: "CE",
        phone: null,
        websiteUrl: null,
        rating: null,
        reviewCount: null,
        categories: [],
        favorited: true,
      },
    ],
  };

  function renderResults(props: Partial<ComponentProps<typeof SearchResultsList>> = {}) {
    const handlers = {
      onPageChange: vi.fn(),
      onPageSizeChange: vi.fn(),
      onFilterChange: vi.fn(),
      onSortChange: vi.fn(),
      onViewChange: vi.fn(),
      onToggleFavorite: vi.fn(),
    };
    render(
      <SearchResultsList
        results={results}
        status="completed"
        isLoading={false}
        page={1}
        pageSize={10}
        filter="all"
        sort="relevance"
        view="list"
        {...handlers}
        {...props}
      />,
    );
    return { ...handlers, ...props };
  }

  it("renders businesses with website link and 'Sem site' badge", () => {
    renderResults();

    expect(screen.getByRole("link", { name: "Padaria Central" })).toHaveAttribute(
      "href",
      "/businesses/b1",
    );
    expect(screen.getByRole("link", { name: /site/i })).toHaveAttribute(
      "href",
      "https://padariacentral.com.br/",
    );
    // "Sem site" existe como chip de filtro (button) e como badge (span).
    const badge = screen.getAllByText("Sem site").find((el) => el.tagName === "SPAN");
    expect(badge).toBeDefined();
  });

  it("asks the parent to filter businesses without website", () => {
    const onFilterChange = vi.fn();
    renderResults({ onFilterChange });

    fireEvent.click(screen.getByRole("button", { name: "Sem site" }));

    expect(onFilterChange).toHaveBeenCalledWith("without_site");
  });

  it("renders a paginated slice count and navigates pages", () => {
    const onPageChange = vi.fn();
    const { rerender } = render(
      <SearchResultsList
        results={results}
        status="completed"
        isLoading={false}
        page={1}
        pageSize={10}
        filter="all"
        sort="relevance"
        view="list"
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
        onFilterChange={vi.fn()}
        onSortChange={vi.fn()}
        onViewChange={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );

    expect(screen.getByText("1-2 de 2 empresas")).toBeInTheDocument();
    expect(screen.getByText("Pagina 1 de 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Proxima" })).toBeDisabled();

    rerender(
      <SearchResultsList
        results={{ ...results, page: 2, total: 12 }}
        status="completed"
        isLoading={false}
        page={2}
        pageSize={10}
        filter="all"
        sort="relevance"
        view="list"
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
        onFilterChange={vi.fn()}
        onSortChange={vi.fn()}
        onViewChange={vi.fn()}
        onToggleFavorite={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("favorites a business from the list view", () => {
    const onToggleFavorite = vi.fn();
    renderResults({ onToggleFavorite });

    fireEvent.click(screen.getByRole("button", { name: "Favoritar" }));

    expect(onToggleFavorite).toHaveBeenCalledWith(results.items[0]);
  });

  it("shows favorited state and allows unfavoriting from the card view", () => {
    const onToggleFavorite = vi.fn();
    renderResults({ view: "cards", onToggleFavorite });

    fireEvent.click(screen.getByRole("button", { name: "Desfavoritar" }));

    expect(onToggleFavorite).toHaveBeenCalledWith(results.items[1]);
  });

  it("renders card view and toggles back to list", () => {
    const onViewChange = vi.fn();
    renderResults({ view: "cards", onViewChange });

    expect(screen.getByRole("button", { name: "Ver em cards" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Ver em lista" }));
    expect(onViewChange).toHaveBeenCalledWith("list");
  });

  it("shows a subtle updating state while a new page is loading", () => {
    renderResults({ isUpdating: true, results: { ...results, total: 12 } });

    expect(screen.getByText("Atualizando resultados...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Proxima" })).toBeDisabled();
  });

  it("shows searching empty state while the search is running", () => {
    render(
      <SearchResultsList
        results={{ page: 1, pageSize: 60, total: 0, items: [] }}
        status="processing"
        isLoading={false}
        page={1}
        pageSize={10}
        filter="all"
        sort="relevance"
        view="list"
        {...listHandlers}
      />,
    );

    expect(screen.getByText("Procurando empresas...")).toBeInTheDocument();
  });

  it("shows honest empty state when a finished search found nothing", () => {
    render(
      <SearchResultsList
        results={{ page: 1, pageSize: 60, total: 0, items: [] }}
        status="completed"
        isLoading={false}
        page={1}
        pageSize={10}
        filter="all"
        sort="relevance"
        view="list"
        {...listHandlers}
      />,
    );

    expect(screen.getByText("Nenhuma empresa encontrada")).toBeInTheDocument();
  });

  it("keeps filter controls visible when the active filter has no results", () => {
    renderResults({
      results: { page: 1, pageSize: 10, total: 0, items: [] },
      filter: "without_site",
    });

    expect(screen.getByRole("button", { name: "Sem site" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Nenhuma empresa neste filtro")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma empresa encontrada")).not.toBeInTheDocument();
  });
});
