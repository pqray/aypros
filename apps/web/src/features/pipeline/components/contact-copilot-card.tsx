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
  toast,
} from "@aypros/ui";
import type { ContactChannel, ContactCopilotOutput, LeadStage, LeadStatus } from "@aypros/types";
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

function dueInDaysLabel(dueInDays: number): string {
  if (dueInDays <= 0) return "hoje";
  if (dueInDays === 1) return "amanhã";
  return `em ${dueInDays} dias`;
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
  const analyze = useGenerateContactCopilot(leadId);
  const createNote = useCreateNote(orgId, leadId);
  const createContact = useCreateLeadContact(orgId, leadId);

  const [channel, setChannel] = useState<ContactChannel>("whatsapp");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<ContactCopilotOutput | null>(null);
  const [noteDraft, setNoteDraft] = useState("");

  function handleAnalyze() {
    analyze.mutate(
      { channel, transcript },
      {
        onSuccess: (response) => {
          setResult(response.output);
          setNoteDraft(response.output.noteDraft);
        },
        onError: (error) => {
          if (error instanceof ApiError && error.body.code === "RATE_LIMITED") {
            toast.error("Limite diário de gerações com IA atingido.");
            return;
          }
          toast.error(error instanceof ApiError ? error.body.error : "Não foi possível analisar a conversa.");
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
      { channel, note: result?.summary },
      {
        onSuccess: () => toast.success("Contato registrado."),
        onError: () => toast.error("Não foi possível registrar o contato."),
      },
    );
  }

  const whatsappUrl = result && channel === "whatsapp" ? buildWhatsappUrl(phone, result.recommendedReply) : null;
  const hasStagePatch = result?.suggestedLeadPatch.stage && result.suggestedLeadPatch.stage !== null;
  const hasValuePatch = result?.suggestedLeadPatch.potentialValue !== null && result?.suggestedLeadPatch.potentialValue !== undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Copiloto de contato</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
          <div className="space-y-2">
            <Label htmlFor="copilot-channel">Canal</Label>
            <Select value={channel} onValueChange={(value) => setChannel(value as ContactChannel)}>
              <SelectTrigger id="copilot-channel">
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
          <div className="space-y-2">
            <Label htmlFor="copilot-transcript">O que aconteceu na conversa</Label>
            <Textarea
              id="copilot-transcript"
              rows={4}
              placeholder="Cole ou descreva como foi a conversa..."
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
            />
          </div>
        </div>

        <Button type="button" loading={analyze.isPending} disabled={transcript.trim().length < 10} onClick={handleAnalyze}>
          <PiSparkle aria-hidden />
          Analisar conversa
        </Button>

        {result ? (
          <div className="space-y-4 border-t pt-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Resumo</p>
              <p className="text-sm text-foreground">{result.summary}</p>
              <p className="text-sm text-muted-foreground">{result.customerPosition}</p>
            </div>

            <BulletList title="Objeções" items={result.objections} variant="warning" />
            <BulletList title="Sinais positivos" items={result.positiveSignals} variant="success" />
            <BulletList title="Riscos / incertezas" items={result.risks} />

            <div className="space-y-2">
              <Label htmlFor="copilot-reply">Sugestão de resposta</Label>
              <Textarea id="copilot-reply" rows={3} readOnly value={result.recommendedReply} />
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
              <p className="text-sm font-medium text-foreground">{result.recommendedNextAction.label}</p>
              <p className="text-xs text-muted-foreground">
                {dueInDaysLabel(result.recommendedNextAction.dueInDays)} — {result.recommendedNextAction.reason}
              </p>
            </div>

            {hasStagePatch || hasValuePatch ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed p-3">
                <p className="text-sm text-muted-foreground">
                  Sugestão:{" "}
                  {hasStagePatch ? (
                    <span className="font-medium text-foreground">
                      mover para {leadStageLabels[result!.suggestedLeadPatch.stage as LeadStage]}
                    </span>
                  ) : null}
                  {hasStagePatch && hasValuePatch ? " · " : ""}
                  {hasValuePatch ? (
                    <span className="font-medium text-foreground">
                      valor potencial R$ {result!.suggestedLeadPatch.potentialValue}
                    </span>
                  ) : null}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyPatch(result!.suggestedLeadPatch)}
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

            {result.confidenceNotes.length > 0 ? (
              <p className="text-xs italic text-muted-foreground">{result.confidenceNotes.join(" ")}</p>
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
        ) : (
          <p className="text-sm text-muted-foreground">
            Descreva como foi a conversa e clique em &ldquo;Analisar conversa&rdquo; para receber
            uma leitura comercial — resumo, objeções, resposta sugerida e próxima ação. Nada é
            aplicado ao lead sem sua confirmação.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
