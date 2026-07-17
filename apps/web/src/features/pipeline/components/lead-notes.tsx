"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ConfirmDialog, Textarea, toast } from "@aypros/ui";
import type { LeadNote } from "@aypros/types";
import { createNoteSchema, type CreateNoteInput } from "@aypros/validation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { PiPencilSimple, PiTrash } from "react-icons/pi";
import { formatRelativeTime } from "@/lib/format";
import { useCreateNote, useDeleteNote, useUpdateNote } from "../queries";

function NoteForm({ leadId, orgId }: { leadId: string; orgId: string | undefined }) {
  const createNote = useCreateNote(orgId, leadId);
  const form = useForm<CreateNoteInput>({
    resolver: zodResolver(createNoteSchema),
    defaultValues: { content: "" },
  });

  function onSubmit(values: CreateNoteInput) {
    createNote.mutate(values.content, {
      onSuccess: () => form.reset({ content: "" }),
      onError: () => toast.error("Não foi possível salvar a nota."),
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2" noValidate>
      <Textarea
        placeholder="Adicionar uma nota..."
        rows={3}
        {...form.register("content")}
      />
      {form.formState.errors.content ? (
        <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
      ) : null}
      <Button type="submit" size="sm" loading={createNote.isPending}>
        Adicionar nota
      </Button>
    </form>
  );
}

function NoteItem({ note, leadId, orgId }: { note: LeadNote; leadId: string; orgId: string | undefined }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const updateNote = useUpdateNote(orgId, leadId);
  const deleteNote = useDeleteNote(orgId, leadId);

  function handleSave() {
    const trimmed = content.trim();
    if (!trimmed) return;
    updateNote.mutate(
      { noteId: note.id, content: trimmed },
      {
        onSuccess: () => setEditing(false),
        onError: () => toast.error("Não foi possível atualizar a nota."),
      },
    );
  }

  function handleDelete() {
    deleteNote.mutate(note.id, {
      onSuccess: () => setConfirmingDelete(false),
      onError: () => toast.error("Não foi possível remover a nota."),
    });
  }

  return (
    <div className="rounded-md border bg-card px-3 py-2.5 text-sm">
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{note.authorName ?? "Alguém da equipe"}</span>
        <div className="flex items-center gap-2">
          <span>{formatRelativeTime(note.createdAt)}</span>
          {!editing ? (
            <>
              <button
                type="button"
                aria-label="Editar nota"
                className="hover:text-foreground"
                onClick={() => {
                  setContent(note.content);
                  setEditing(true);
                }}
              >
                <PiPencilSimple aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Remover nota"
                className="hover:text-destructive"
                onClick={() => setConfirmingDelete(true)}
              >
                <PiTrash aria-hidden />
              </button>
            </>
          ) : null}
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} />
          <div className="flex gap-2">
            <Button type="button" size="sm" loading={updateNote.isPending} onClick={handleSave}>
              Salvar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <p className="whitespace-pre-wrap text-foreground">{note.content}</p>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title="Remover nota?"
        description="Essa ação não pode ser desfeita."
        confirmLabel="Remover"
        destructive
        loading={deleteNote.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function LeadNotes({
  leadId,
  orgId,
  notes,
}: {
  leadId: string;
  orgId: string | undefined;
  notes: LeadNote[];
}) {
  return (
    <div className="space-y-3">
      <NoteForm leadId={leadId} orgId={orgId} />
      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma nota ainda.</p>
      ) : (
        <div className="space-y-2">
          {notes.map((note) => (
            <NoteItem key={note.id} note={note} leadId={leadId} orgId={orgId} />
          ))}
        </div>
      )}
    </div>
  );
}
