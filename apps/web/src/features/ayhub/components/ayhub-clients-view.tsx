"use client";

import {
  Badge,
  BusinessLogo,
  Button,
  EmptyState,
  PageHeader,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@aypros/ui";
import type { AyhubClientStatus } from "@aypros/types";
import Link from "next/link";
import { useState } from "react";
import { PiBookOpenText, PiBuildings, PiChartBar, PiPlus } from "react-icons/pi";
import { useAyhubClients } from "../queries";
import { CreateClientDialog } from "./create-client-dialog";

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

const originLabels = {
  pipeline: "Pipeline Aypros",
  manual: "Manual",
} as const;

function formatCurrency(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ClientsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_4rem] gap-4 border-b p-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-4" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, row) => (
          <div key={row} className="grid grid-cols-[2fr_1fr_1fr_1fr_4rem] gap-4 p-3">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AyhubClientsView() {
  const clients = useAyhubClients();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="space-y-4">
      <PageHeader
        title="AYhub"
        description="Clientes e sites que você constrói e mantém."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/ayhub/docs">
                <PiBookOpenText aria-hidden />
                Documentação
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/ayhub">
                <PiChartBar aria-hidden />
                Dashboard
              </Link>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <PiPlus aria-hidden />
              Cadastrar cliente
            </Button>
          </>
        }
      />

      {clients.isLoading ? (
        <ClientsTableSkeleton />
      ) : !clients.data || clients.data.items.length === 0 ? (
        <EmptyState
          icon={<PiBuildings />}
          title="Nenhum cliente ainda"
          description="Clientes aparecem aqui automaticamente quando uma oportunidade vira 'ganho' na pipeline, ou você pode cadastrar um manualmente."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <PiPlus aria-hidden />
              Cadastrar cliente
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor de manutenção</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Sites</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.data.items.map((client) => (
              <TableRow key={client.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/ayhub/${client.id}`} className="flex items-center gap-2 font-medium text-foreground hover:underline">
                    <BusinessLogo name={client.name} className="size-7" />
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariants[client.status]}>{statusLabels[client.status]}</Badge>
                </TableCell>
                <TableCell>{formatCurrency(client.maintenanceValue)}</TableCell>
                <TableCell className="text-muted-foreground">{originLabels[client.origin]}</TableCell>
                <TableCell>{client.sitesCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CreateClientDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
