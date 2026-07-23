"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  cn,
  toast,
} from "@aypros/ui";
import type {
  ContactChannel,
  ContactCopilotEvaluationOutput,
  ContactCopilotReplyOutput,
  ContactCopilotTurn,
  LeadStage,
  LeadStatus,
} from "@aypros/types";
import { useState } from "react";
import { PiCheckCircle, PiPaperPlaneTilt, PiSparkle, PiWhatsappLogo } from "react-icons/pi";
import { useAppContext } from "@/components/shell/use-app-context";
import { ApiError } from "../api";
import { buildWhatsappUrl } from "@/features/ai/outreach";
import { useCreateLeadContact, useCreateNote, useGenerateContactCopilot } from "../queries";

const channelLabels: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  phone: "Telefone",
  other: "Outro",
};

const leadStageLabels: Record<LeadStage, string> = {
  new: "Novo",
  contacted: "Contactado",
  in_conversation: "Em conversa",
  proposal_sent: "Proposta enviada",
  won: "Ganho",
  lost: "Perdido",
};

const alignmentLabels: Record<ContactCopilotEvaluationOutput["alignment"], string> = {
  aligned: "Alinhada",
  partial: "Parcialmente alinhada",
  off_track: "Foge do combinado",
};

const alignmentVariants: Record<ContactCopilotEvaluationOutput["alignment"], "success" | "warning" | "destructive"> = {
  aligned: "success",
  partial: "warning",
  off_track: "destructive",
};

function dueInDaysLabel(dueInDays: number): string {
  if (dueInDays <= 0) return "hoje";
  if (dueInDays === 1) return "amanhã";
  return `em ${dueInDays} dias`;
}

function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.body.code === "RATE_LIMITED") return "Limite diário de gerações com IA atingido.";
    return error.body.error;
  }
  return fallback;
}

function BulletList({ title, items, variant }: { title: string; items: string[]; variant?: "warning" | "success" | "destructive" }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <Badge variant={variant ?? "muted"} className="mt-0.5 shrink-0">
              {index + 1}
            </Badge>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ConversationHistory({ history }: { history: ContactCopilotTurn[] }) {
  if (history.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Histórico da conversa</p>
      <div className="space-y-1.5">
        {history.map((turn, index) => (
          <div
            key={index}
            className={cn(
              "max-w-[90%] rounded-md px-3 py-2 text-sm",
              turn.role === "seller" ? "ml-auto bg-primary/10 text-foreground" : "bg-muted text-foreground",
            )}
          >
            <p className="mb-0.5 text-xs font-medium text-muted-foreground">
              {turn.role === "seller" ? "Você" : "Cliente"}
            </p>
            <p className="whitespace-pre-wrap">{turn.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactCopilotCard({
  leadId,
  phone,
  onApplyPatch,
}: {
  leadId: string;
  phone: string | null;
  onApplyPatch: (patch: { stage: LeadStage | null; status: LeadStatus | null; potentialValue: number | null }) => void;
}) {
  const { data: context } = useAppContext();
  const orgId = context?.organization?.id;
  const generate = useGenerateContactCopilot(leadId);
  const createNote = useCreateNote(orgId, leadId);
  const createContact = useCreateLeadContact(orgId, leadId);

  const [channel, setChannel] = useState<ContactChannel>("whatsapp");
  const [history, setHistory] = useState<ContactCopilotTurn[]>([]);

  const [draftMessage, setDraftMessage] = useState("");
  const [evaluation, setEvaluation] = useState<ContactCopilotEvaluationOutput | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  const [clientReply, setClientReply] = useState("");
  const [reply, setReply] = useState<ContactCopilotReplyOutput | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  function handleEvaluate() {
    const text = draftMessage.trim();
    if (text.length < 10) return;
    setEvaluating(true);
    generate.mutate(
      { channel, mode: "evaluate_message", text, history },
      {
        onSuccess: (response) => {
          setEvaluating(false);
          if (response.mode !== "evaluate_message") return;
          setEvaluation(response.output);
          setHistory((prev) => [...prev, { role: "seller", text }]);
        },
        onError: (error) => {
          setEvaluating(false);
          toast.error(apiErrorMessage(error, "Não foi possível avaliar a mensagem."));
        },
      },
    );
  }

  function handleAnalyzeReply() {
    const text = clientReply.trim();
    if (text.length < 10) return;
    setAnalyzing(true);
    generate.mutate(
      { channel, mode: "analyze_reply", text, history },
      {
        onSuccess: (response) => {
          setAnalyzing(false);
          if (response.mode !== "analyze_reply") return;
          setReply(response.output);
          setNoteDraft(response.output.noteDraft);
          setHistory((prev) => [...prev, { role: "client", text }]);
          setClientReply("");
        },
        onError: (error) => {
          setAnalyzing(false);
          toast.error(apiErrorMessage(error, "Não foi possível analisar a resposta."));
        },
      },
    );
  }

  function handleSaveNote() {
    if (!noteDraft.trim()) return;
    createNote.mutate(noteDraft.trim(), {
      onSuccess: () => toast.success("Nota salva."),
      onError: () => toast.error("Não foi possível salvar a nota."),
    });
  }

  function handleRegisterContact() {
    createContact.mutate(
      { channel, note: reply?.summary },
      {
        onSuccess: () => toast.success("Contato registrado."),
        onError: () => toast.error("Não foi possível registrar o contato."),
      },
    );
  }

  const whatsappUrl = reply && channel === "whatsapp" ? buildWhatsappUrl(phone, reply.recommendedReply) : null;
  const hasStagePatch = reply?.suggestedLeadPatch.stage && reply.suggestedLeadPatch.stage !== null;
  const hasValuePatch = reply?.suggestedLeadPatch.potentialValue !== null && reply?.suggestedLeadPatch.potentialValue !== undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Copiloto de contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="copilot-channel">Canal</Label>
          <Select value={channel} onValueChange={(value) => setChannel(value as ContactChannel)}>
            <SelectTrigger id="copilot-channel" className="sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(channelLabels) as ContactChannel[]).map((option) => (
                <SelectItem key={option} value={option}>
                  {channelLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ConversationHistory history={history} />

        {/* Passo 1: avaliar a mensagem antes de mandar */}
        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor="copilot-draft">O que você vai mandar</Label>
          <Textarea
            id="copilot-draft"
            rows={3}
            placeholder="Cole aqui a mensagem antes de enviar pro cliente..."
            value={draftMessage}
            onChange={(event) => setDraftMessage(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            loading={evaluating}
            disabled={draftMessage.trim().length < 10}
            onClick={handleEvaluate}
          >
            <PiSparkle aria-hidden />
            Avaliar mensagem
          </Button>

          {evaluation ? (
            <div className="space-y-3 border-t pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={alignmentVariants[evaluation.alignment]}>{alignmentLabels[evaluation.alignment]}</Badge>
                <span className="text-sm text-muted-foreground">Nota {evaluation.score}/5</span>
              </div>
              <p className="text-sm text-foreground">{evaluation.rationale}</p>
              <BulletList title="Pontos fortes" items={evaluation.strengths} variant="success" />
              <BulletList title="Riscos" items={evaluation.risks} variant="warning" />
              {evaluation.suggestedRevision ? (
                <div className="space-y-2">
                  <Label htmlFor="copilot-suggested-revision">Sugestão de revisão</Label>
                  <Textarea id="copilot-suggested-revision" rows={3} readOnly value={evaluation.suggestedRevision} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!evaluation.suggestedRevision) return;
                      setDraftMessage(evaluation.suggestedRevision);
                      setEvaluation(null);
                      setHistory((prev) => prev.slice(0, -1));
                    }}
                  >
                    Usar sugestão
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Passo 2: analisar a resposta do cliente */}
        <div className="space-y-2 rounded-md border p-3">
          <Label htmlFor="copilot-reply-input">O que o cliente respondeu</Label>
          <Textarea
            id="copilot-reply-input"
            rows={3}
            placeholder="Cole aqui a resposta do cliente..."
            value={clientReply}
            onChange={(event) => setClientReply(event.target.value)}
          />
          <Button
            type="button"
            size="sm"
            loading={analyzing}
            disabled={clientReply.trim().length < 10}
            onClick={handleAnalyzeReply}
          >
            <PiSparkle aria-hidden />
            Analisar resposta
          </Button>

          {reply ? (
            <div className="space-y-4 border-t pt-3">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo</p>
                <p className="text-sm text-foreground">{reply.summary}</p>
                <p className="text-sm text-muted-foreground">{reply.customerPosition}</p>
              </div>

              <BulletList title="Objeções" items={reply.objections} variant="warning" />
              <BulletList title="Sinais positivos" items={reply.positiveSignals} variant="success" />
              <BulletList title="Riscos / incertezas" items={reply.risks} />

              <div className="space-y-2">
                <Label htmlFor="copilot-recommended-reply">Sugestão de resposta</Label>
                <Textarea id="copilot-recommended-reply" rows={3} readOnly value={reply.recommendedReply} />
                {whatsappUrl ? (
                  <Button asChild variant="outline" size="sm">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <PiWhatsappLogo aria-hidden />
                      Abrir no WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="rounded-md border p-3">
                <p className="text-sm font-medium text-foreground">{reply.recommendedNextAction.label}</p>
                <p className="text-xs text-muted-foreground">
                  {dueInDaysLabel(reply.recommendedNextAction.dueInDays)} — {reply.recommendedNextAction.reason}
                </p>
              </div>

              {hasStagePatch || hasValuePatch ? (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3">
                  <p className="text-sm text-muted-foreground">
                    Sugestão:{" "}
                    {hasStagePatch ? (
                      <span className="font-medium text-foreground">
                        mover para {leadStageLabels[reply!.suggestedLeadPatch.stage as LeadStage]}
                      </span>
                    ) : null}
                    {hasStagePatch && hasValuePatch ? " · " : ""}
                    {hasValuePatch ? (
                      <span className="font-medium text-foreground">
                        valor potencial R$ {reply!.suggestedLeadPatch.potentialValue}
                      </span>
                    ) : null}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onApplyPatch(reply!.suggestedLeadPatch)}
                  >
                    Aplicar
                  </Button>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="copilot-note">Nota pronta para salvar</Label>
                <Textarea
                  id="copilot-note"
                  rows={3}
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                />
              </div>

              {reply.confidenceNotes.length > 0 ? (
                <p className="text-xs italic text-muted-foreground">{reply.confidenceNotes.join(" ")}</p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" loading={createNote.isPending} onClick={handleSaveNote}>
                  <PiCheckCircle aria-hidden />
                  Salvar como nota
                </Button>
                <Button type="button" variant="outline" loading={createContact.isPending} onClick={handleRegisterContact}>
                  <PiPaperPlaneTilt aria-hidden />
                  Registrar contato
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {!evaluation && !reply ? (
          <p className="text-sm text-muted-foreground">
            Cole a mensagem que você vai mandar pra receber uma avaliação antes de enviar, e depois cole a
            resposta do cliente pra receber uma leitura comercial — resumo, objeções, resposta sugerida e
            próxima ação. Nada é aplicado ao lead sem sua confirmação.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
