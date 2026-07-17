import type { AiGenerationSummary } from "@aypros/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiGenerationsCard } from "./ai-generations-card";

const mutate = vi.fn();
let generationsData: { items: AiGenerationSummary[] } | undefined;

vi.mock("@/components/shell/use-app-context", () => ({
  useAppContext: () => ({ data: { organization: { id: "org1" } } }),
}));

vi.mock("../queries", () => ({
  useAiGenerations: () => ({ data: generationsData, isLoading: false }),
  useGenerateAi: () => ({ mutate, isPending: false, variables: undefined }),
}));

function makeGeneration(overrides: Partial<AiGenerationSummary> = {}): AiGenerationSummary {
  return {
    id: "g1",
    kind: "whatsapp_message",
    status: "completed",
    output: { message: "Olá! Vi que a Padaria Central ainda não tem site." },
    model: "llama-3.3-70b-versatile",
    tokensUsed: 200,
    promptVersion: "whatsapp-v1",
    createdAt: "2026-07-17T12:00:00Z",
    ...overrides,
  };
}

describe("AiGenerationsCard", () => {
  beforeEach(() => {
    mutate.mockClear();
    generationsData = { items: [] };
  });

  it("shows the three kinds as tabs with generate buttons and no auto-send", () => {
    render(<AiGenerationsCard businessId="b1" />);

    expect(screen.getByRole("tab", { name: "Resumo" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "WhatsApp" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "E-mail" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /gerar/i })).toBeInTheDocument();
  });

  it("calls the mutation with the active kind", () => {
    render(<AiGenerationsCard businessId="b1" />);

    fireEvent.click(screen.getByRole("button", { name: /gerar/i }));

    expect(mutate).toHaveBeenCalledWith("commercial_summary", expect.anything());
  });

  it("loads the latest completed generation as an editable draft", async () => {
    generationsData = { items: [makeGeneration()] };
    const user = userEvent.setup();
    render(<AiGenerationsCard businessId="b1" />);

    await user.click(screen.getByRole("tab", { name: "WhatsApp" }));

    const textarea = await screen.findByDisplayValue(
      "Olá! Vi que a Padaria Central ainda não tem site.",
    );
    fireEvent.change(textarea, { target: { value: "Texto editado pela usuária." } });
    expect(screen.getByDisplayValue("Texto editado pela usuária.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /regenerar/i })).toBeInTheDocument();
  });

  it("copies the edited draft to the clipboard", async () => {
    generationsData = { items: [makeGeneration()] };
    const user = userEvent.setup();
    // userEvent.setup() instala um stub próprio de clipboard — sobrescrever depois dele.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<AiGenerationsCard businessId="b1" />);

    await user.click(screen.getByRole("tab", { name: "WhatsApp" }));
    fireEvent.click(await screen.findByRole("button", { name: /copiar/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("Olá! Vi que a Padaria Central ainda não tem site.");
    });
  });

  it("prefixes the subject when copying an e-mail draft", async () => {
    generationsData = {
      items: [
        makeGeneration({
          id: "g2",
          kind: "email_message",
          output: { subject: "Uma ideia para a Padaria Central", body: "Olá, tudo bem?" },
        }),
      ],
    };
    const user = userEvent.setup();
    // userEvent.setup() instala um stub próprio de clipboard — sobrescrever depois dele.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    render(<AiGenerationsCard businessId="b1" />);

    await user.click(screen.getByRole("tab", { name: "E-mail" }));
    fireEvent.click(await screen.findByRole("button", { name: /copiar/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        "Assunto: Uma ideia para a Padaria Central\n\nOlá, tudo bem?",
      );
    });
  });

  it("ignores failed generations when building the draft", async () => {
    generationsData = {
      items: [makeGeneration({ id: "g3", status: "failed", output: null })],
    };
    const user = userEvent.setup();
    render(<AiGenerationsCard businessId="b1" />);

    await user.click(screen.getByRole("tab", { name: "WhatsApp" }));

    expect(screen.getByText(/mensagem curta de primeira abordagem/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^gerar$/i })).toBeInTheDocument();
  });
});
