import { TooltipProvider } from "@aypros/ui";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardActivity, DashboardOpportunity, DashboardPipelineDistribution, DashboardSearch } from "../schemas";
import { ActivitiesBlock } from "./activities-block";
import { MetricCards } from "./metric-cards";
import { OpportunitiesBlock } from "./opportunities-block";
import { PipelineDistributionBlock } from "./pipeline-distribution-block";
import { RecentSearchesBlock } from "./recent-searches-block";
import { WelcomeHero } from "./welcome-hero";

vi.mock("@/components/shell/use-app-context", () => ({
  useAppContext: () => ({ data: { organization: { id: "org1" } } }),
}));

vi.mock("@/features/pipeline/queries", () => ({
  useCreateLead: () => ({ mutate: vi.fn(), isPending: false, variables: undefined }),
}));

const NOW = new Date("2026-07-16T12:00:00Z");

describe("MetricCards", () => {
  it("shows honest hints when everything is zero", () => {
    render(
      <MetricCards
        metrics={{
          searchesCount: 0,
          businessesCount: 0,
          businessesWithoutWebsiteCount: 0,
          activeLeadsCount: 0,
        }}
      />,
    );

    expect(screen.getByText("Nenhuma pesquisa ainda")).toBeInTheDocument();
    expect(screen.getByText("Nenhuma empresa descoberta ainda")).toBeInTheDocument();
    expect(screen.getByText("Pipeline vazio")).toBeInTheDocument();
  });

  it("shows real values without zero hints", () => {
    render(
      <MetricCards
        metrics={{
          searchesCount: 3,
          businessesCount: 42,
          businessesWithoutWebsiteCount: 17,
          activeLeadsCount: 5,
        }}
      />,
    );

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.queryByText("Nenhuma pesquisa ainda")).not.toBeInTheDocument();
  });
});

describe("OpportunitiesBlock", () => {
  it("renders an empty state with CTA to discovery", () => {
    render(
      <TooltipProvider>
        <OpportunitiesBlock opportunities={[]} />
      </TooltipProvider>,
    );

    expect(screen.getByText("Nenhuma oportunidade ainda")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /descobrir empresas/i })).toHaveAttribute(
      "href",
      "/discovery",
    );
  });

  it("renders opportunities with score badge and business link", () => {
    const opportunities: DashboardOpportunity[] = [
      {
        businessId: "b1",
        businessName: "Padaria Central",
        city: "Fortaleza",
        state: "CE",
        score: 82,
        level: "very_high",
        mainReason: "Não possui site próprio (+40)",
      },
    ];

    render(
      <TooltipProvider>
        <OpportunitiesBlock opportunities={opportunities} />
      </TooltipProvider>,
    );

    expect(screen.getByText("Padaria Central")).toBeInTheDocument();
    expect(screen.getByText("Não possui site próprio (+40)")).toBeInTheDocument();
    expect(screen.getByText("Muito alta")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /padaria central/i })).toHaveAttribute(
      "href",
      "/businesses/b1",
    );
  });
});

describe("RecentSearchesBlock", () => {
  it("renders an empty state with CTA to discovery", () => {
    render(<RecentSearchesBlock searches={[]} now={NOW} />);

    expect(screen.getByText("Nenhuma pesquisa ainda")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fazer primeira pesquisa/i })).toHaveAttribute(
      "href",
      "/discovery",
    );
  });

  it("renders searches with status label and result count", () => {
    const searches: DashboardSearch[] = [
      {
        id: "s1",
        city: "Fortaleza",
        state: "CE",
        segment: "Restaurantes",
        status: "completed",
        totalFound: 37,
        createdAt: "2026-07-16T10:00:00Z",
      },
      {
        id: "s2",
        city: "Sobral",
        state: "CE",
        segment: "Clínicas",
        status: "failed",
        totalFound: 0,
        createdAt: "2026-07-15T10:00:00Z",
      },
    ];

    render(<RecentSearchesBlock searches={searches} now={NOW} />);

    expect(screen.getByText("Restaurantes em Fortaleza/CE")).toBeInTheDocument();
    expect(screen.getByText(/37 empresas encontradas/)).toBeInTheDocument();
    expect(screen.getByText("Concluída")).toBeInTheDocument();
    expect(screen.getByText("Falhou")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver todas/i })).toHaveAttribute("href", "/searches");

    const rowLink = screen.getByRole("link", { name: /restaurantes em fortaleza/i });
    expect(rowLink.getAttribute("href")).toContain("search=s1");
    expect(rowLink.getAttribute("href")).toContain("/discovery?");
  });
});

describe("ActivitiesBlock", () => {
  it("renders an empty state without CTA", () => {
    render(<ActivitiesBlock activities={[]} now={NOW} />);

    expect(screen.getByText("Nenhuma atividade ainda")).toBeInTheDocument();
  });

  it("renders activity labels with payload details", () => {
    const activities: DashboardActivity[] = [
      {
        id: "a1",
        type: "search_created",
        payload: { city: "Fortaleza", segment: "Restaurantes" },
        createdAt: "2026-07-16T11:00:00Z",
      },
      {
        id: "a2",
        type: "lead_created",
        payload: { business_name: "Padaria Central" },
        createdAt: "2026-07-16T09:00:00Z",
      },
    ];

    render(<ActivitiesBlock activities={activities} now={NOW} />);

    expect(screen.getByText(/pesquisa criada/i)).toBeInTheDocument();
    expect(screen.getByText(/restaurantes em fortaleza/i)).toBeInTheDocument();
    expect(screen.getByText(/lead adicionado ao pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/padaria central/i)).toBeInTheDocument();
  });
});

describe("PipelineDistributionBlock", () => {
  it("renders an empty state with CTA to businesses when there are no leads", () => {
    render(<PipelineDistributionBlock distribution={[]} />);

    expect(screen.getByText("Pipeline vazio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver empresas/i })).toHaveAttribute("href", "/businesses");
  });

  it("renders the legend with stage labels, counts and percentages", () => {
    const distribution: DashboardPipelineDistribution[] = [
      { stage: "new", count: 3 },
      { stage: "contacted", count: 1 },
      { stage: "in_conversation", count: 0 },
      { stage: "proposal_sent", count: 0 },
      { stage: "won", count: 0 },
      { stage: "lost", count: 0 },
    ];

    render(<PipelineDistributionBlock distribution={distribution} />);

    expect(screen.getByText("Novo")).toBeInTheDocument();
    expect(screen.getByText("3 · 75%")).toBeInTheDocument();
    expect(screen.getByText("Contactado")).toBeInTheDocument();
    expect(screen.getByText("1 · 25%")).toBeInTheDocument();
    expect(screen.queryByText("Pipeline vazio")).not.toBeInTheDocument();
  });
});

describe("WelcomeHero", () => {
  it("greets the organization and points to discovery", () => {
    render(<WelcomeHero organizationName="Agência Aypros" />);

    expect(screen.getByText(/bem-vindo à agência aypros/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fazer primeira pesquisa/i })).toHaveAttribute(
      "href",
      "/discovery",
    );
  });
});
