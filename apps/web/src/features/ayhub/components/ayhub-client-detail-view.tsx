"use client";

import {
  Badge,
  BusinessLogo,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  Label,
  PageHeader,
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
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  PiArrowLeft,
  PiCalendarBlank,
  PiCheck,
  PiCreditCard,
  PiGlobe,
  PiPhone,
  PiPlus,
} from "react-icons/pi";
import { useAyhubClient, useCreateAyhubPayment, useUpdateAyhubClient } from "../queries";
import { CreateSiteDialog } from "./create-site-dialog";

const statusLabels: Record<AyhubClientStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
  delinquent: "Inadimplente",
};

const statusVariants: Record<AyhubClientStatus, "success" | "muted" | "destructive"> = {
  active: "success",
  inactive: "muted",
  delinquent: "destructive",
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
  if (value === null) return "-";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value: string): string {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR");
}

function SummaryItem({ label, value, icon }: { label: string; value: ReactNode; icon: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground [&_svg]:size-4">
          {icon}
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="truncate text-sm font-medium text-foreground">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function AyhubClientDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[74px]" />
        ))}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-28" />
        </CardContent>
      </Card>
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
    updateClient.mutate(input, {
      onError: () => toast.error("Não foi possível salvar a alteração."),
    });
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
  const lastPayment = payments[0];
  const parsedPaymentAmount = Number(paymentAmount.trim());
  const canRegisterPayment =
    parsedPaymentAmount > 0 && !Number.isNaN(parsedPaymentAmount) && Boolean(paymentDate);
  const originLabel = originLeadBusinessName
    ? `Veio da pipeline: ${originLeadBusinessName}`
    : "Cadastrado manualmente";

  return (
    <div className="space-y-4">
      <PageHeader
        title={client.name}
        description={originLabel}
        icon={<BusinessLogo name={client.name} className="size-11" />}
        actions={
          <Button asChild variant="outline">
            <Link href="/ayhub/clients">
              <PiArrowLeft aria-hidden />
              Clientes
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryItem
          label="Status"
          value={
            <Badge variant={statusVariants[client.status]}>{statusLabels[client.status]}</Badge>
          }
          icon={<PiCheck />}
        />
        <SummaryItem
          label="Manutenção mensal"
          value={formatCurrency(client.maintenanceValue)}
          icon={<PiCreditCard />}
        />
        <SummaryItem label="Contato" value={client.contact || "Sem contato"} icon={<PiPhone />} />
        <SummaryItem
          label="Último pagamento"
          value={
            lastPayment
              ? `${formatCurrency(lastPayment.amount)} em ${formatDate(lastPayment.date)}`
              : "Nenhum registro"
          }
          icon={<PiCalendarBlank />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>Dados do cliente</CardTitle>
            <CardDescription>Alterações são salvas ao sair do campo.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ayhub-client-name">Nome</Label>
              <Input
                id="ayhub-client-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onBlur={handleNameBlur}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ayhub-client-contact">Contato</Label>
              <Input
                id="ayhub-client-contact"
                value={contact}
                placeholder="Telefone, WhatsApp ou e-mail"
                onChange={(event) => setContact(event.target.value)}
                onBlur={handleContactBlur}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ayhub-client-value">Manutenção mensal (R$)</Label>
              <Input
                id="ayhub-client-value"
                type="number"
                min={0}
                step="0.01"
                value={maintenanceValue}
                onChange={(event) => setMaintenanceValue(event.target.value)}
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
            <CardDescription>Registre recebimentos de manutenção desse cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_10rem] xl:grid-cols-1">
                <div className="space-y-2">
                  <Label htmlFor="ayhub-payment-amount">Valor (R$)</Label>
                  <Input
                    id="ayhub-payment-amount"
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0,00"
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ayhub-payment-date">Data</Label>
                  <Input
                    id="ayhub-payment-date"
                    type="date"
                    value={paymentDate}
                    onChange={(event) => setPaymentDate(event.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                loading={createPayment.isPending}
                disabled={!canRegisterPayment}
                onClick={handleRegisterPayment}
              >
                <PiCheck aria-hidden />
                Registrar pagamento
              </Button>
            </div>

            <div className="border-t pt-3">
              {payments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Histórico recente
                  </p>
                  {payments.slice(0, 5).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {formatCurrency(payment.amount)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(payment.date)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <CardTitle>Sites</CardTitle>
            <CardDescription>
              Projetos entregues ou em desenvolvimento para este cliente.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setCreateSiteOpen(true)}>
            <PiPlus aria-hidden />
            Adicionar site
          </Button>
        </CardHeader>
        <CardContent>
          {sites.length === 0 ? (
            <EmptyState
              className="py-8"
              icon={<PiGlobe />}
              title="Nenhum site ainda"
              description="Adicione um site quando o projeto entrar em desenvolvimento ou for entregue."
              action={
                <Button size="sm" variant="outline" onClick={() => setCreateSiteOpen(true)}>
                  <PiPlus aria-hidden />
                  Adicionar site
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
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
                      <Link
                        href={`/ayhub/sites/${site.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {site.slug}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{site.domain ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={siteStatusVariants[site.status]}>
                        {siteStatusLabels[site.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatCurrency(site.monthlyCostTotal)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {site.nextRenewal ?? "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateSiteDialog
        clientId={clientId}
        fromPipeline={client.origin === "pipeline" && sites.length === 0}
        open={createSiteOpen}
        onOpenChange={setCreateSiteOpen}
      />
    </div>
  );
}
