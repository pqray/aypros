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
import { PiCheckCircle, PiCopy, PiSparkle, PiWhatsappLogo } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { useCreateLeadContact } from "@/features/pipeline/queries";
import { formatRelativeTime } from "@/lib/format";
import { useTabParam } from "@/lib/use-tab-param";
import { ApiError } from "../api";
import { buildWhatsappUrl } from "../outreach";
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
  whatsapp_message: "Geré uma mensagem curta de primeira abordagem para enviar no WhatsApp.",
  email_message: "Gere um e-mail de prospecção com assunto e corpo prontos para revisar.",
};

type Draft = {
  sourceId: string;
  subject: string;
  text: string;
};

function listSection(title: string, items: string[]): string | null {
  if (items.length === 0) return null;
  return `${title}:\n${items.map((item) => `- ${item}`).join("\n")}`;
}

function outputToDraft(kind: AiKind, generation: AiGenerationSummary): Draft {
  const output = generation.output as AiOutput | null;
  if (!output) return { sourceId: generation.id, subject: "", text: "" };

  // summary-v2 (fase 17): análise consultiva estruturada.
  if (kind === "commercial_summary" && "context" in output) {
    const sections = [
      output.context,
      `Presença digital:\n${output.digitalPresence}`,
      listSection("Sinais fortes", output.strongSignals),
      listSection("Sinais fracos", output.weakSignals),
      listSection("Lacunas (não verificado)", output.gaps),
      output.channelDependence ? `Dependência de canal:\n${output.channelDependence}` : null,
      `Impacto comercial:\n${output.commercialImpact}`,
      `Oferta recomendada:\n${output.recommendedOffer}`,
      `Ângulo de abordagem:\n${output.salesAngle}`,
      listSection("Objeções esperadas", output.expectedObjections),
      `Próximo passo:\n${output.nextStep}`,
    ].filter((section): section is string => section !== null);
    return { sourceId: generation.id, subject: "", text: sections.join("\n\n") };
  }

  // summary-v1 (gerações antigas persistidas continuam legíveis).
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

export function AiGenerationsCard({
  businessId,
  leadId,
  phone,
}: {
  businessId: string;
  leadId?: string | null;
  phone?: string | null;
}) {
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const generations = useAiGenerations(orgId, businessId);
  const generate = useGenerateAi(orgId, businessId);
  const createContact = useCreateLeadContact(orgId, leadId ?? undefined);
  // Kind ativo na URL: gerar/invalidar/remontar nunca volta a aba pro Resumo.
  const [activeKind, setActiveKind] = useTabParam<AiKind>("ai", "commercial_summary", AI_KINDS);

  const [drafts, setDrafts] = useState<Partial<Record<AiKind, Draft>>>({});

  const latestByKind: Partial<Record<AiKind, AiGenerationSummary>> = {};
  for (const item of generations.data?.items ?? []) {
    if (item.status === "completed" && item.output && !latestByKind[item.kind]) {
      latestByKind[item.kind] = item;
    }
  }
  // Items are newest-first; capture ids in a stable string só the effect below
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
    setActiveKind(kind);
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

  function contactChannelForKind(kind: AiKind) {
    if (kind === "whatsapp_message") return "whatsapp" as const;
    if (kind === "email_message") return "email" as const;
    return null;
  }

  function handleMarkSent(kind: AiKind) {
    const channel = contactChannelForKind(kind);
    if (!channel || !leadId) return;

    createContact.mutate(
      { channel, note: channel === "whatsapp" ? "Rascunho de WhatsApp marcado como enviado." : "Rascunho de e-mail marcado como enviado." },
      {
        onSuccess: () => toast.success("Contato registrado."),
        onError: () => toast.error("Não foi possível registrar o contato."),
      },
    );
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
          <Tabs value={activeKind} onValueChange={(value) => setActiveKind(value as AiKind)}>
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
              const contactChannel = contactChannelForKind(kind);
              const whatsappUrl =
                kind === "whatsapp_message" && draft ? buildWhatsappUrl(phone, draft.text) : null;
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
                    {whatsappUrl ? (
                      <Button asChild variant="outline">
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                          <PiWhatsappLogo aria-hidden />
                          Abrir no WhatsApp
                        </a>
                      </Button>
                    ) : null}
                    {draft && contactChannel && leadId ? (
                      <Button
                        variant="outline"
                        onClick={() => handleMarkSent(kind)}
                        loading={createContact.isPending}
                      >
                        <PiCheckCircle aria-hidden />
                        Marcar como enviada
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
