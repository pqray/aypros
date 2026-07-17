"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@aypros/ui";
import type { AiGenerationSummary, AiKind, AiOutput } from "@aypros/types";
import { useEffect, useState } from "react";
import { PiCopy, PiSparkle } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { formatRelativeTime } from "@/lib/format";
import { ApiError } from "../api";
import { useAiGenerations, useGenerateAi } from "../queries";

const AI_KINDS = ["commercial_summary", "whatsapp_message", "email_message"] as const;

const kindLabels: Record<AiKind, string> = {
  commercial_summary: "Resumo",
  whatsapp_message: "WhatsApp",
  email_message: "E-mail",
};

const kindEmptyHints: Record<AiKind, string> = {
  commercial_summary:
    "Gere um resumo comercial da oportunidade: situação digital, dores prováveis e ângulo de venda.",
  whatsapp_message: "Gere uma mensagem curta de primeira abordagem para enviar no WhatsApp.",
  email_message: "Gere um e-mail de prospecção com assunto e corpo prontos para revisar.",
};

type Draft = {
  sourceId: string;
  subject: string;
  text: string;
};

function outputToDraft(kind: AiKind, generation: AiGenerationSummary): Draft {
  const output = generation.output as AiOutput | null;
  if (!output) return { sourceId: generation.id, subject: "", text: "" };

  if (kind === "commercial_summary" && "summary" in output) {
    const sections = [output.summary];
    if (output.painPoints.length > 0) {
      sections.push(`Dores prováveis:\n${output.painPoints.map((point) => `- ${point}`).join("\n")}`);
    }
    sections.push(`Ângulo de venda:\n${output.salesAngle}`);
    return { sourceId: generation.id, subject: "", text: sections.join("\n\n") };
  }
  if (kind === "whatsapp_message" && "message" in output) {
    return { sourceId: generation.id, subject: "", text: output.message };
  }
  if (kind === "email_message" && "subject" in output) {
    return { sourceId: generation.id, subject: output.subject, text: output.body };
  }
  return { sourceId: generation.id, subject: "", text: "" };
}

export function AiGenerationsCard({ businessId }: { businessId: string }) {
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const generations = useAiGenerations(orgId, businessId);
  const generate = useGenerateAi(orgId, businessId);

  const [drafts, setDrafts] = useState<Partial<Record<AiKind, Draft>>>({});

  const latestByKind: Partial<Record<AiKind, AiGenerationSummary>> = {};
  for (const item of generations.data?.items ?? []) {
    if (item.status === "completed" && item.output && !latestByKind[item.kind]) {
      latestByKind[item.kind] = item;
    }
  }
  // Items are newest-first; capture ids in a stable string so the effect below
  // only rewrites a draft when a *new* generation lands (user edits survive).
  const latestIds = AI_KINDS.map((kind) => latestByKind[kind]?.id ?? "").join("|");

  useEffect(() => {
    setDrafts((current) => {
      let changed = false;
      const next = { ...current };
      for (const kind of AI_KINDS) {
        const generation = latestByKind[kind];
        if (generation && current[kind]?.sourceId !== generation.id) {
          next[kind] = outputToDraft(kind, generation);
          changed = true;
        }
      }
      return changed ? next : current;
    });
    // latestIds is the memo key for latestByKind (rebuilt every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestIds]);

  function handleGenerate(kind: AiKind) {
    generate.mutate(kind, {
      onError: (error) => {
        if (error instanceof ApiError && error.body.code === "RATE_LIMITED") {
          toast.error("Limite diário de gerações com IA atingido.");
          return;
        }
        toast.error(error instanceof ApiError ? error.body.error : "Erro ao gerar conteúdo.");
      },
    });
  }

  async function handleCopy(kind: AiKind) {
    const draft = drafts[kind];
    if (!draft) return;
    const content =
      kind === "email_message" && draft.subject
        ? `Assunto: ${draft.subject}\n\n${draft.text}`
        : draft.text;
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copiado para a área de transferência.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  }

  function updateDraft(kind: AiKind, patch: Partial<Pick<Draft, "subject" | "text">>) {
    setDrafts((current) => {
      const draft = current[kind];
      if (!draft) return current;
      return { ...current, [kind]: { ...draft, ...patch } };
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abordagem com IA</CardTitle>
      </CardHeader>
      <CardContent>
        {generations.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-40" />
          </div>
        ) : (
          <Tabs defaultValue="commercial_summary">
            <TabsList>
              {AI_KINDS.map((kind) => (
                <TabsTrigger key={kind} value={kind}>
                  {kindLabels[kind]}
                </TabsTrigger>
              ))}
            </TabsList>
            {AI_KINDS.map((kind) => {
              const draft = drafts[kind];
              const latest = latestByKind[kind];
              const isGenerating = generate.isPending && generate.variables === kind;
              return (
                <TabsContent key={kind} value={kind} className="space-y-3">
                  {draft ? (
                    <>
                      {kind === "email_message" ? (
                        <div className="space-y-2">
                          <Label htmlFor={`ai-subject-${businessId}`}>Assunto</Label>
                          <Input
                            id={`ai-subject-${businessId}`}
                            value={draft.subject}
                            onChange={(event) => updateDraft(kind, { subject: event.target.value })}
                          />
                        </div>
                      ) : null}
                      <div className="space-y-2">
                        <Label htmlFor={`ai-draft-${kind}-${businessId}`}>
                          Rascunho editável — nada é enviado automaticamente
                        </Label>
                        <Textarea
                          id={`ai-draft-${kind}-${businessId}`}
                          value={draft.text}
                          rows={kind === "whatsapp_message" ? 6 : 10}
                          onChange={(event) => updateDraft(kind, { text: event.target.value })}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{kindEmptyHints[kind]}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => handleGenerate(kind)}
                      loading={isGenerating}
                      disabled={!orgId || (generate.isPending && !isGenerating)}
                    >
                      <PiSparkle aria-hidden />
                      {draft ? "Regenerar" : "Gerar"}
                    </Button>
                    {draft ? (
                      <Button variant="outline" onClick={() => handleCopy(kind)}>
                        <PiCopy aria-hidden />
                        Copiar
                      </Button>
                    ) : null}
                    {latest ? (
                      <p className="text-xs text-muted-foreground">
                        Gerado {formatRelativeTime(latest.createdAt)} · {latest.model}
                      </p>
                    ) : null}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
