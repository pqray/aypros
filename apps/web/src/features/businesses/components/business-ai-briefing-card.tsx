"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Skeleton,
  toast,
} from "@aypros/ui";
import type { BusinessBriefing } from "@aypros/types";
import type { ReactNode } from "react";
import { CollapsibleCard } from "@/components/collapsible-card";
import {
  PiArrowClockwise,
  PiBrain,
  PiCheckCircle,
  PiCompass,
  PiLightbulb,
  PiMegaphone,
  PiTarget,
  PiWarningCircle,
} from "react-icons/pi";
import { useBusinessBriefing, useGenerateBusinessBriefing } from "../queries";

function BriefingSection({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  icon: ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        <p className="text-sm font-semibold">{title}</p>
      </div>
      <div className="text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

function BulletList({ items, tone }: { items: string[]; tone: "opportunity" | "risk" | "note" }) {
  const variant = tone === "risk" ? "destructive" : tone === "opportunity" ? "success" : "secondary";
  if (items.length === 0) {
    return <p>Nenhum ponto relevante salvo para esta seção.</p>;
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2">
          <Badge variant={variant} className="mt-0.5 shrink-0">
            {tone === "opportunity" ? "Oportunidade" : tone === "risk" ? "Risco" : "Nota"}
          </Badge>
          <span className="min-w-0">{item}</span>
        </div>
      ))}
    </div>
  );
}

function BriefingContent({ briefing }: { briefing: BusinessBriefing }) {
  const content = briefing.content;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <BriefingSection title="Contexto" icon={<PiCompass aria-hidden />}>
          {content.context}
        </BriefingSection>
        <BriefingSection title="Presença digital" icon={<PiBrain aria-hidden />}>
          {content.digitalPresence}
        </BriefingSection>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <BriefingSection title="Oportunidades" icon={<PiLightbulb aria-hidden />}>
          <BulletList items={content.opportunities} tone="opportunity" />
        </BriefingSection>
        <BriefingSection title="Riscos e incertezas" icon={<PiWarningCircle aria-hidden />}>
          <BulletList items={content.risks} tone="risk" />
        </BriefingSection>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <BriefingSection title="Ângulo" icon={<PiMegaphone aria-hidden />}>
          {content.salesAngle}
        </BriefingSection>
        <BriefingSection title="Oferta" icon={<PiTarget aria-hidden />}>
          {content.recommendedOffer}
        </BriefingSection>
        <BriefingSection title="Próximo passo" icon={<PiCheckCircle aria-hidden />}>
          {content.nextStep}
        </BriefingSection>
      </div>

      {content.confidenceNotes.length > 0 ? (
        <BriefingSection title="Notas de confiança" icon={<PiWarningCircle aria-hidden />}>
          <BulletList items={content.confidenceNotes} tone="note" />
        </BriefingSection>
      ) : null}
    </div>
  );
}

function BriefingSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-28" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </CardContent>
    </Card>
  );
}

export function BusinessAiBriefingCard({ businessId }: { businessId: string }) {
  const briefing = useBusinessBriefing(businessId);
  const generate = useGenerateBusinessBriefing(businessId);
  const current = briefing.data?.briefing ?? null;

  function handleGenerate() {
    generate.mutate(undefined, {
      onSuccess: () => toast.success(current ? "Briefing atualizado." : "Briefing gerado."),
      onError: () => toast.error("Não foi possível gerar o briefing agora."),
    });
  }

  if (briefing.isLoading || generate.isPending) {
    return <BriefingSkeleton />;
  }

  return (
    <CollapsibleCard
      storageKey="business-detail:ai-briefing"
      title="Briefing IA"
      description="Leitura consultiva da empresa para preparar abordagem comercial."
      headerActions={
        current ? (
          <Button type="button" variant="outline" size="sm" loading={generate.isPending} onClick={handleGenerate}>
            <PiArrowClockwise aria-hidden />
            {current.isStale ? "Atualizar" : "Regenerar"}
          </Button>
        ) : null
      }
    >
      <CardContent>
        {current ? (
          <BriefingContent briefing={current} />
        ) : (
          <EmptyState
            icon={<PiBrain />}
            title="Nenhum briefing gerado"
            description="Gere uma leitura comercial com base no score, auditoria, presença digital e pipeline."
            action={
              <Button type="button" loading={generate.isPending} onClick={handleGenerate}>
                <PiBrain aria-hidden />
                Gerar briefing
              </Button>
            }
          />
        )}
      </CardContent>
    </CollapsibleCard>
  );
}
