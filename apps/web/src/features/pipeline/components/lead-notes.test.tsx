import type { LeadNote } from "@aypros/types";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadNotes } from "./lead-notes";

const createNoteMutate = vi.fn();
const updateNoteMutate = vi.fn();
const deleteNoteMutate = vi.fn();

vi.mock("../queries", () => ({
  useCreateNote: () => ({ mutate: createNoteMutate, isPending: false }),
  useUpdateNote: () => ({ mutate: updateNoteMutate, isPending: false }),
  useDeleteNote: () => ({ mutate: deleteNoteMutate, isPending: false }),
}));

const notes: LeadNote[] = [
  {
    id: "n1",
    leadId: "l1",
    authorId: "u1",
    authorName: "Rayssa",
    content: "Primeiro contato feito por telefone.",
    createdAt: "2026-07-16T12:00:00Z",
    updatedAt: "2026-07-16T12:00:00Z",
  },
];

describe("LeadNotes", () => {
  beforeEach(() => {
    createNoteMutate.mockClear();
    updateNoteMutate.mockClear();
    deleteNoteMutate.mockClear();
  });

  it("shows an honest empty state with no notes", () => {
    render(<LeadNotes leadId="l1" orgId="org1" notes={[]} />);

    expect(screen.getByText("Nenhuma nota ainda.")).toBeInTheDocument();
  });

  it("renders each note with author and content", () => {
    render(<LeadNotes leadId="l1" orgId="org1" notes={notes} />);

    expect(screen.getByText("Rayssa")).toBeInTheDocument();
    expect(screen.getByText("Primeiro contato feito por telefone.")).toBeInTheDocument();
  });

  it("submits a new note through the form", async () => {
    render(<LeadNotes leadId="l1" orgId="org1" notes={[]} />);

    fireEvent.change(screen.getByPlaceholderText("Adicionar uma nota..."), {
      target: { value: "Follow-up agendado." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar nota" }));

    await waitFor(() => expect(createNoteMutate).toHaveBeenCalledWith("Follow-up agendado.", expect.anything()));
  });

  it("does not submit an empty note", async () => {
    render(<LeadNotes leadId="l1" orgId="org1" notes={[]} />);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar nota" }));

    await waitFor(() => {
      expect(screen.getByText(/nota deve ter pelo menos/i)).toBeInTheDocument();
    });
    expect(createNoteMutate).not.toHaveBeenCalled();
  });

  it("deletes a note after confirming", async () => {
    render(<LeadNotes leadId="l1" orgId="org1" notes={notes} />);

    fireEvent.click(screen.getByLabelText("Remover nota"));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));

    expect(deleteNoteMutate).toHaveBeenCalledWith("n1", expect.anything());
  });
});
