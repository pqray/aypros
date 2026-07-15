import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCommandPaletteStore } from "@/stores/command-palette-store";
import { CommandPalette } from "./command-palette";

const push = vi.fn();
const setTheme = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme }),
}));

describe("CommandPalette", () => {
  beforeEach(() => {
    push.mockClear();
    setTheme.mockClear();
    useCommandPaletteStore.setState({ open: false });
  });

  it("opens with Ctrl+K", async () => {
    const user = userEvent.setup();
    render(<CommandPalette />);

    await user.keyboard("{Control>}k{/Control}");

    expect(screen.getByPlaceholderText(/buscar página ou ação/i)).toBeInTheDocument();
  });

  it("navigates when a page command is selected", async () => {
    const user = userEvent.setup();
    useCommandPaletteStore.setState({ open: true });
    render(<CommandPalette />);

    await user.click(screen.getByText("Pipeline"));

    expect(push).toHaveBeenCalledWith("/pipeline");
  });
});
