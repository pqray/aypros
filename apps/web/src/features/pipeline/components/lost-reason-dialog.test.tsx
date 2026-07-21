import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LostReasonDialog } from "./lost-reason-dialog";

describe("LostReasonDialog", () => {
  it("keeps the confirm button disabled until a reason is typed", () => {
    const onConfirm = vi.fn();
    render(<LostReasonDialog open onOpenChange={() => {}} onConfirm={onConfirm} />);

    const confirmButton = screen.getByRole("button", { name: "Marcar como perdido" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Já tem site próprio" } });
    expect(confirmButton).not.toBeDisabled();
  });

  it("calls onConfirm with the trimmed reason", () => {
    const onConfirm = vi.fn();
    render(<LostReasonDialog open onOpenChange={() => {}} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "  Achou caro  " } });
    fireEvent.click(screen.getByRole("button", { name: "Marcar como perdido" }));

    expect(onConfirm).toHaveBeenCalledWith("Achou caro");
  });

  it("never calls onConfirm from the cancel button", () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(<LostReasonDialog open onOpenChange={onOpenChange} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Não é prioridade agora" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("resets the reason field after closing and reopening", () => {
    const { rerender } = render(
      <LostReasonDialog open onOpenChange={() => {}} onConfirm={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText("Motivo"), { target: { value: "Rascunho perdido" } });
    rerender(<LostReasonDialog open={false} onOpenChange={() => {}} onConfirm={vi.fn()} />);
    rerender(<LostReasonDialog open onOpenChange={() => {}} onConfirm={vi.fn()} />);

    expect(screen.getByLabelText("Motivo")).toHaveValue("");
  });
});
