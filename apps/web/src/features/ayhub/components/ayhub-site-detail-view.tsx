"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  toast,
} from "@aypros/ui";
import type {
  AyhubContentBlock,
  AyhubContentBlockType,
  AyhubCostType,
  AyhubFrequency,
  AyhubOwner,
  AyhubSiteStatus,
} from "@aypros/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PiArrowLeft, PiKey, PiPlus, PiTrash, PiUploadSimple, PiWarningCircle } from "react-icons/pi";
import {
  useAyhubSite,
  useCreateAyhubContentBlock,
  useCreateAyhubSiteCost,
  useCreateAyhubSiteKey,
  useDeleteAyhubSiteCost,
  usePublishAyhubSite,
  useRevokeAyhubSiteKey,
  useUpdateAyhubContentBlock,
  useUpdateAyhubSite,
} from "../queries";

const siteStatusLabels: Record<AyhubSiteStatus, string> = {
  development: "Em desenvolvimento",
  live: "Produção",
  maintenance: "Manutenção",
  paused: "Pausado",
};

const siteStatusVariants: Record<AyhubSiteStatus, "secondary" | "success" | "warning" | "muted"> = {
  development: "secondary",
  live: "success",
  maintenance: "warning",
  paused: "muted",
};

const ownerLabels: Record<AyhubOwner, string> = { me: "Eu", client: "Cliente" };

const costTypeLabels: Record<AyhubCostType, string> = {
  domain: "Domínio",
  hosting: "Hospedagem",
  storage: "Storage",
  other: "Outro",
};

const frequencyLabels: Record<AyhubFrequency, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  once: "Único",
};

const seoLabels: Record<string, string> = {
  "seo.title": "Título (SEO)",
  "seo.description": "Descrição (SEO)",
  "seo.og_image": "Imagem OG (SEO)",
};

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function isRenewalSoon(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const diffDays = (new Date(`${dateStr}T00:00:00`).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  return diffDays <= 30;
}

function blockDraftToString(block: AyhubContentBlock): string {
  if (block.type === "list") return JSON.stringify(block.draftValue ?? [], null, 2);
  return typeof block.draftValue === "string" ? block.draftValue : "";
}

function SiteKeySection({ siteId, activeKey }: { siteId: string; activeKey: { id: string; createdAt: string; lastUsedAt: string | null } | null }) {
  const createKey = useCreateAyhubSiteKey(siteId);
  const revokeKey = useRevokeAyhubSiteKey(siteId);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);

  function handleGenerate() {
    createKey.mutate(undefined, {
      onSuccess: (response) => setNewKey(response.key),
      onError: () => toast.error("Não foi possível gerar a chave."),
    });
  }

  function handleRevoke() {
    if (!activeKey) return;
    revokeKey.mutate(activeKey.id, {
      onSuccess: () => {
        toast.success("Chave revogada.");
        setRevokeOpen(false);
      },
      onError: () => toast.error("Não foi possível revogar a chave."),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">SITE_KEY</p>
          {activeKey ? (
            <p className="text-xs text-muted-foreground">
              Ativa desde {new Date(activeKey.createdAt).toLocaleDateString("pt-BR")}
              {activeKey.lastUsedAt
                ? ` · último uso ${new Date(activeKey.lastUsedAt).toLocaleDateString("pt-BR")}`
                : " · nunca usada"}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma chave ativa.</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" loading={createKey.isPending} onClick={handleGenerate}>
            <PiKey aria-hidden />
            Gerar nova
          </Button>
          {activeKey ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setRevokeOpen(true)}
            >
              Revogar
            </Button>
          ) : null}
        </div>
      </div>

      <Dialog open={newKey !== null} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>SITE_KEY gerada</DialogTitle>
            <DialogDescription>
              Copie agora — por segurança, ela não será exibida em texto puro novamente. Veja em{" "}
              <Link href="/ayhub/docs" className="underline">
                Documentação
              </Link>{" "}
              como configurar essa chave no site de cliente.
            </DialogDescription>
          </DialogHeader>
          <code className="block break-all rounded-md border bg-muted p-3 text-sm">{newKey}</code>
          <DialogFooter>
            <Button
              onClick={() => {
                if (newKey) void navigator.clipboard.writeText(newKey);
                toast.success("Copiado.");
              }}
            >
              Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revogar SITE_KEY?"
        description="O site de cliente para de conseguir buscar conteúdo até que uma nova chave seja gerada e configurada no Vercel."
        confirmLabel="Revogar"
        destructive
        loading={revokeKey.isPending}
        onConfirm={handleRevoke}
      />
    </div>
  );
}

function CostsSection({ siteId, costs }: { siteId: string; costs: import("@aypros/types").AyhubSiteCost[] }) {
  const createCost = useCreateAyhubSiteCost(siteId);
  const deleteCost = useDeleteAyhubSiteCost(siteId);
  const [type, setType] = useState<AyhubCostType>("domain");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<AyhubFrequency>("yearly");
  const [nextRenewal, setNextRenewal] = useState("");
  const [paymentOwner, setPaymentOwner] = useState<AyhubOwner>("me");

  function handleAdd() {
    const parsed = Number(amount.trim());
    if (Number.isNaN(parsed) || parsed < 0) return;
    createCost.mutate(
      {
        type,
        amount: parsed,
        frequency,
        nextRenewal: nextRenewal || null,
        paymentOwner,
      },
      {
        onSuccess: () => {
          setAmount("");
          setNextRenewal("");
        },
        onError: () => toast.error("Não foi possível adicionar o custo."),
      },
    );
  }

  return (
    <div className="space-y-4">
      {costs.length > 0 ? (
        <div className="space-y-2">
          {costs.map((cost) => (
            <div key={cost.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium text-foreground">
                  {costTypeLabels[cost.type]} · {formatCurrency(cost.amount)} ({frequencyLabels[cost.frequency]})
                </p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  Responsável: {ownerLabels[cost.paymentOwner]}
                  {cost.nextRenewal ? ` · renova em ${cost.nextRenewal}` : ""}
                  {isRenewalSoon(cost.nextRenewal) ? (
                    <Badge variant="warning">
                      <PiWarningCircle aria-hidden /> renovação próxima
                    </Badge>
                  ) : null}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Remover custo"
                onClick={() => deleteCost.mutate(cost.id)}
              >
                <PiTrash aria-hidden />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum custo cadastrado.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Select value={type} onValueChange={(value) => setType(value as AyhubCostType)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(costTypeLabels) as AyhubCostType[]).map((option) => (
              <SelectItem key={option} value={option}>
                {costTypeLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="number" min={0} step="0.01" placeholder="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Select value={frequency} onValueChange={(value) => setFrequency(value as AyhubFrequency)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(frequencyLabels) as AyhubFrequency[]).map((option) => (
              <SelectItem key={option} value={option}>
                {frequencyLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentOwner} onValueChange={(value) => setPaymentOwner(value as AyhubOwner)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ownerLabels) as AyhubOwner[]).map((option) => (
              <SelectItem key={option} value={option}>
                {ownerLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={nextRenewal} onChange={(e) => setNextRenewal(e.target.value)} />
        <Button type="button" className="sm:col-span-2" loading={createCost.isPending} onClick={handleAdd}>
          <PiPlus aria-hidden />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

function ContentBlockField({ siteId, block }: { siteId: string; block: AyhubContentBlock }) {
  const updateBlock = useUpdateAyhubContentBlock(siteId);
  const [draft, setDraft] = useState(() => blockDraftToString(block));

  useEffect(() => {
    setDraft(blockDraftToString(block));
  }, [block]);

  function handleBlur() {
    if (block.type === "list") {
      try {
        const parsed = JSON.parse(draft || "[]");
        updateBlock.mutate({ blockId: block.id, draftValue: parsed });
      } catch {
        toast.error(`"${block.key}": JSON inválido.`);
      }
      return;
    }
    if (draft === (typeof block.draftValue === "string" ? block.draftValue : "")) return;
    updateBlock.mutate({ blockId: block.id, draftValue: draft });
  }

  const label = seoLabels[block.key] ?? block.key;
  const changed = JSON.stringify(block.draftValue) !== JSON.stringify(block.publishedValue);

  return (
    <div className="space-y-2">
      <Label htmlFor={`block-${block.id}`} className="flex items-center gap-2">
        {label}
        {changed ? (
          <Badge variant="warning" className="text-[10px]">
            não publicado
          </Badge>
        ) : null}
      </Label>
      {block.type === "list" ? (
        <Textarea id={`block-${block.id}`} rows={4} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={handleBlur} />
      ) : block.type === "text" && draft.length > 80 ? (
        <Textarea id={`block-${block.id}`} rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={handleBlur} />
      ) : (
        <Input id={`block-${block.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={handleBlur} />
      )}
    </div>
  );
}

function AddContentBlockForm({ siteId }: { siteId: string }) {
  const createBlock = useCreateAyhubContentBlock(siteId);
  const [key, setKey] = useState("");
  const [type, setType] = useState<AyhubContentBlockType>("text");

  function handleAdd() {
    if (key.trim() === "") return;
    createBlock.mutate(
      { key: key.trim(), type },
      {
        onSuccess: () => setKey(""),
        onError: () => toast.error("Não foi possível criar o campo. Verifique se a chave já existe."),
      },
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-t pt-4">
      <div className="space-y-2">
        <Label htmlFor="ayhub-block-key">Nova chave</Label>
        <Input id="ayhub-block-key" placeholder="hero.title" value={key} onChange={(e) => setKey(e.target.value)} />
      </div>
      <Select value={type} onValueChange={(value) => setType(value as AyhubContentBlockType)}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">Texto</SelectItem>
          <SelectItem value="image">Imagem</SelectItem>
          <SelectItem value="list">Lista</SelectItem>
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" loading={createBlock.isPending} onClick={handleAdd}>
        <PiPlus aria-hidden />
        Adicionar campo
      </Button>
    </div>
  );
}

function AyhubSiteDetailSkeleton() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(20rem,3fr)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:col-span-2">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <Skeleton className="h-5 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-8 w-36" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-9" />
            <Skeleton className="h-24" />
            <Skeleton className="h-9" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-28" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-20" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function AyhubSiteDetailView({ siteId }: { siteId: string }) {
  const detail = useAyhubSite(siteId);
  const updateSite = useUpdateAyhubSite(siteId);
  const publishSite = usePublishAyhubSite(siteId);
  const [status, setStatus] = useState<AyhubSiteStatus>("development");
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (detail.data) setStatus(detail.data.site.status);
  }, [detail.data]);

  if (detail.isLoading) {
    return <AyhubSiteDetailSkeleton />;
  }

  if (!detail.data) {
    return (
      <EmptyState
        title="Site não encontrado"
        action={
          <Button asChild variant="outline">
            <Link href="/ayhub/clients">Voltar aos clientes</Link>
          </Button>
        }
      />
    );
  }

  const { site, clientName, costs, contentBlocks, hasUnpublishedChanges, activeKey } = detail.data;
  const seoBlocks = contentBlocks.filter((block) => block.key.startsWith("seo."));
  const generalBlocks = contentBlocks.filter((block) => !block.key.startsWith("seo."));
  const changedBlocks = contentBlocks.filter(
    (block) => JSON.stringify(block.draftValue) !== JSON.stringify(block.publishedValue),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-foreground">{site.slug}</h1>
            <Badge variant={siteStatusVariants[site.status]}>{siteStatusLabels[site.status]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Cliente:{" "}
            <Link href={`/ayhub/${site.clientId}`} className="font-medium text-foreground hover:underline">
              {clientName}
            </Link>
            {site.domain ? ` · ${site.domain}` : ""}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/ayhub/${site.clientId}`}>
            <PiArrowLeft aria-hidden />
            Cliente
          </Link>
        </Button>
      </div>

      <div className="space-y-4 xl:col-start-2 xl:row-start-2">
        <Card>
        <CardHeader>
          <CardTitle>Dados do site</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ayhub-site-status">Status</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as AyhubSiteStatus);
                  updateSite.mutate({ status: value as AyhubSiteStatus });
                }}
              >
                <SelectTrigger id="ayhub-site-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(siteStatusLabels) as AyhubSiteStatus[]).map((option) => (
                    <SelectItem key={option} value={option}>
                      {siteStatusLabels[option]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Domínio</Label>
              <p className="text-sm text-muted-foreground">
                {site.domain ?? "—"} (responsável: {ownerLabels[site.domainOwner]})
              </p>
            </div>
          </div>

          <SiteKeySection siteId={siteId} activeKey={activeKey} />
        </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custos</CardTitle>
          </CardHeader>
          <CardContent>
            <CostsSection siteId={siteId} costs={costs} />
          </CardContent>
        </Card>
      </div>

      <Card className="xl:col-start-1 xl:row-start-2">
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle>Conteúdo</CardTitle>
          <div className="flex items-center gap-2">
            {hasUnpublishedChanges ? (
              <Badge variant="warning">{changedBlocks.length} alteração(ões) não publicada(s)</Badge>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={() => setShowComparison((v) => !v)}>
              Visualizar rascunho
            </Button>
            <Button
              type="button"
              size="sm"
              loading={publishSite.isPending}
              disabled={!hasUnpublishedChanges}
              onClick={() =>
                publishSite.mutate(undefined, {
                  onSuccess: (response) => toast.success(`${response.publishedCount} bloco(s) publicado(s).`),
                  onError: () => toast.error("Não foi possível publicar."),
                })
              }
            >
              <PiUploadSimple aria-hidden />
              Publicar alterações
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showComparison ? (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-xs font-medium uppercase text-muted-foreground">Rascunho vs. publicado</p>
              {changedBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada pendente de publicação.</p>
              ) : (
                changedBlocks.map((block) => (
                  <div key={block.id} className="grid gap-1 text-sm sm:grid-cols-[10rem_1fr_1fr]">
                    <span className="font-medium text-foreground">{seoLabels[block.key] ?? block.key}</span>
                    <span className="truncate text-muted-foreground">
                      rascunho: {JSON.stringify(block.draftValue) ?? "—"}
                    </span>
                    <span className="truncate text-muted-foreground">
                      publicado: {JSON.stringify(block.publishedValue) ?? "—"}
                    </span>
                  </div>
                ))
              )}
            </div>
          ) : null}

          <Tabs defaultValue="geral">
            <TabsList>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>
            <TabsContent value="geral" className="space-y-4">
              {generalBlocks.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum campo de conteúdo geral ainda.</p>
              ) : (
                generalBlocks.map((block) => <ContentBlockField key={block.id} siteId={siteId} block={block} />)
              )}
              <AddContentBlockForm siteId={siteId} />
            </TabsContent>
            <TabsContent value="seo" className="space-y-4">
              {seoBlocks.map((block) => (
                <ContentBlockField key={block.id} siteId={siteId} block={block} />
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
