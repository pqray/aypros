"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
} from "@aypros/ui";
import type { AyhubClientStatus, AyhubSiteStatus } from "@aypros/types";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PiArrowLeft, PiCheck, PiGlobe, PiPlus } from "react-icons/pi";
import { useAyhubClient, useCreateAyhubPayment, useUpdateAyhubClient } from "../queries";
import { CreateSiteDialog } from "./create-site-dialog";

const statusLabels: Record<AyhubClientStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  delinquent: "Inadimplente",
};

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

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function AyhubClientDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56" />
          <Skeleton className="h-5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-8 w-28" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-10" />
          ))}
        </CardContent>
      </Card>
      <Skeleton className="h-32" />
    </div>
  );
}

export function AyhubClientDetailView({ clientId }: { clientId: string }) {
  const detail = useAyhubClient(clientId);
  const updateClient = useUpdateAyhubClient(clientId);
  const createPayment = useCreateAyhubPayment(clientId);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [maintenanceValue, setMaintenanceValue] = useState("");
  const [createSiteOpen, setCreateSiteOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (!detail.data) return;
    setName(detail.data.client.name);
    setContact(detail.data.client.contact ?? "");
    setMaintenanceValue(detail.data.client.maintenanceValue?.toString() ?? "");
  }, [detail.data]);

  function saveField(input: Parameters<typeof updateClient.mutate>[0]) {
    updateClient.mutate(input, { onError: () => toast.error("Não foi possível salvar a alteração.") });
  }

  function handleNameBlur() {
    if (!detail.data || name.trim() === detail.data.client.name) return;
    if (name.trim() === "") return;
    saveField({ name: name.trim() });
  }

  function handleContactBlur() {
    if (!detail.data) return;
    const value = contact.trim() === "" ? null : contact.trim();
    if (value === detail.data.client.contact) return;
    saveField({ contact: value });
  }

  function handleValueBlur() {
    if (!detail.data) return;
    const trimmed = maintenanceValue.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);
    if (parsed !== null && (Number.isNaN(parsed) || parsed < 0)) return;
    if (parsed === detail.data.client.maintenanceValue) return;
    saveField({ maintenanceValue: parsed });
  }

  function handleRegisterPayment() {
    const amount = Number(paymentAmount.trim());
    if (Number.isNaN(amount) || amount <= 0 || !paymentDate) return;
    createPayment.mutate(
      { amount, date: paymentDate },
      {
        onSuccess: () => {
          toast.success("Pagamento registrado.");
          setPaymentAmount("");
        },
        onError: () => toast.error("Não foi possível registrar o pagamento."),
      },
    );
  }

  if (detail.isLoading) {
    return <AyhubClientDetailSkeleton />;
  }

  if (!detail.data) {
    return (
      <EmptyState
        title="Cliente não encontrado"
        action={
          <Button asChild variant="outline">
            <Link href="/ayhub/clients">Voltar aos clientes</Link>
          </Button>
        }
      />
    );
  }

  const { client, sites, originLeadBusinessName, payments } = detail.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{client.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="muted">{statusLabels[client.status]}</Badge>
            {originLeadBusinessName ? <span>Veio da pipeline · {originLeadBusinessName}</span> : null}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/ayhub/clients">
            <PiArrowLeft aria-hidden />
            Clientes
          </Link>
        </Button>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(18rem,3fr)]">
        <Card>
        <CardHeader>
          <CardTitle>Dados do cliente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ayhub-client-name">Nome</Label>
            <Input id="ayhub-client-name" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleNameBlur} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ayhub-client-contact">Contato</Label>
            <Input
              id="ayhub-client-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              onBlur={handleContactBlur}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ayhub-client-value">Valor de manutenção (R$/mês)</Label>
            <Input
              id="ayhub-client-value"
              type="number"
              min={0}
              step="0.01"
              value={maintenanceValue}
              onChange={(e) => setMaintenanceValue(e.target.value)}
              onBlur={handleValueBlur}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ayhub-client-status">Status</Label>
            <Select
              value={client.status}
              onValueChange={(value) => saveField({ status: value as AyhubClientStatus })}
            >
              <SelectTrigger id="ayhub-client-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(statusLabels) as AyhubClientStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {statusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] xl:grid-cols-1">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="ayhub-payment-amount">Valor (R$)</Label>
                  <Input
                    id="ayhub-payment-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ayhub-payment-date">Data</Label>
                  <Input
                    id="ayhub-payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
              </div>
              <Button type="button" className="self-end" loading={createPayment.isPending} onClick={handleRegisterPayment}>
                <PiCheck aria-hidden />
                Registrar
              </Button>
            </div>

            {payments.length > 0 ? (
              <div className="space-y-2 border-t pt-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-foreground">{formatCurrency(payment.amount)}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(payment.date)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t pt-3 text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Sites</CardTitle>
          <Button size="sm" onClick={() => setCreateSiteOpen(true)}>
            <PiPlus aria-hidden />
            Adicionar site
          </Button>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <EmptyState
              icon={<PiGlobe />}
              title="Nenhum site ainda"
              description="Crie um site quando o projeto for efetivamente entregue."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Custo mensal</TableHead>
                  <TableHead>Próxima renovação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <Link href={`/ayhub/sites/${site.id}`} className="font-medium text-foreground hover:underline">
                        {site.slug}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{site.domain ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={siteStatusVariants[site.status]}>{siteStatusLabels[site.status]}</Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(site.monthlyCostTotal)}</TableCell>
                    <TableCell className="text-muted-foreground">{site.nextRenewal ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateSiteDialog clientId={clientId} open={createSiteOpen} onOpenChange={setCreateSiteOpen} />
    </div>
  );
}
