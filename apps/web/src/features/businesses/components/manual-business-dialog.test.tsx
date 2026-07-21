import { TooltipProvider } from "@aypros/ui";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManualBusinessDialog } from "./manual-business-dialog";

const push = vi.fn();
const mutate = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("../queries", () => ({
  useCreateManualBusiness: () => ({
    mutate,
    isPending: false,
  }),
}));

function renderDialog() {
  render(
    <TooltipProvider>
      <ManualBusinessDialog orgId="org-1" open onOpenChange={vi.fn()} />
    </TooltipProvider>,
  );
}

describe("ManualBusinessDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires site or Instagram before submitting", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nome"), "Doceria da Ana");
    await user.type(screen.getByLabelText("Segmento"), "Doceria");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(await screen.findByText("Informe um site ou Instagram")).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });

  it("submits an Instagram-only business", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText("Nome"), "Doceria da Ana");
    await user.type(screen.getByLabelText("Segmento"), "Doceria");
    await user.type(screen.getByLabelText("Instagram"), "@doceriadaana");
    await user.click(screen.getByRole("button", { name: /cadastrar/i }));

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Doceria da Ana",
        segment: "Doceria",
        instagramUrl: "@doceriadaana",
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
