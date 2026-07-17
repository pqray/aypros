"use client";

import {
  BusinessLogo,
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  ScoreBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
  toast,
} from "@aypros/ui";
import type {
  BusinessListItem,
  BusinessSortBy,
  BusinessSortDir,
  BusinessWebsiteFilter,
} from "@aypros/types";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
} from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import {
  PiCaretDown,
  PiCaretUp,
  PiCaretUpDown,
  PiCopySimple,
  PiFunnel,
  PiHeart,
  PiHeartFill,
  PiKanban,
  PiMagnifyingGlass,
  PiStar,
} from "react-icons/pi";
import { SiWhatsapp } from "react-icons/si";
import { WebsiteBadge } from "./website-badge";

const columnHelper = createColumnHelper<BusinessListItem>();

const websiteFilterLabels: Record<BusinessWebsiteFilter, string> = {
  all: "Todas",
  with_site: "Com site",
  without_site: "Sem site",
};

function SortableHeader({
  label,
  column,
  sortBy,
  sortDir,
  onSortChange,
}: {
  label: string;
  column: BusinessSortBy;
  sortBy: BusinessSortBy;
  sortDir: BusinessSortDir;
  onSortChange: (sortBy: BusinessSortBy, sortDir: BusinessSortDir) => void;
}) {
  const active = sortBy === column;
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground"
      onClick={() => onSortChange(column, active && sortDir === "asc" ? "desc" : "asc")}
    >
      {label}
      {active ? (
        sortDir === "asc" ? (
          <PiCaretUp aria-hidden />
        ) : (
          <PiCaretDown aria-hidden />
        )
      ) : (
        <PiCaretUpDown className="opacity-50" aria-hidden />
      )}
    </button>
  );
}

function WebsiteFilterHeader({
  websiteFilter,
  onWebsiteFilterChange,
}: {
  websiteFilter: BusinessWebsiteFilter;
  onWebsiteFilterChange: (filter: BusinessWebsiteFilter) => void;
}) {
  const active = websiteFilter !== "all";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn("flex items-center gap-1 hover:text-foreground", active && "text-foreground")}
        >
          Site
          <PiFunnel className={active ? undefined : "opacity-50"} aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuRadioGroup
          value={websiteFilter}
          onValueChange={(value) => onWebsiteFilterChange(value as BusinessWebsiteFilter)}
        >
          {(Object.keys(websiteFilterLabels) as BusinessWebsiteFilter[]).map((option) => (
            <DropdownMenuRadioItem key={option} value={option}>
              {websiteFilterLabels[option]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function copyPhone(phone: string) {
  void navigator.clipboard.writeText(phone).then(
    () => toast.success("Telefone copiado."),
    () => toast.error("Não foi possível copiar o telefone."),
  );
}

export function BusinessesTable({
  items,
  selectedIds,
  onSelectionChange,
  favoritePendingId,
  onToggleFavorite,
  auditPendingId,
  onAudit,
  pipelinePendingId,
  onAddToPipeline,
  sortBy,
  sortDir,
  onSortChange,
  websiteFilter,
  onWebsiteFilterChange,
}: {
  items: BusinessListItem[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: string[], selected: boolean) => void;
  favoritePendingId: string | null;
  onToggleFavorite: (item: BusinessListItem) => void;
  auditPendingId: string | null;
  onAudit: (businessId: string) => void;
  pipelinePendingId: string | null;
  onAddToPipeline: (businessId: string) => void;
  sortBy: BusinessSortBy;
  sortDir: BusinessSortDir;
  onSortChange: (sortBy: BusinessSortBy, sortDir: BusinessSortDir) => void;
  websiteFilter: BusinessWebsiteFilter;
  onWebsiteFilterChange: (filter: BusinessWebsiteFilter) => void;
}) {
  const rowSelection = useMemo<RowSelectionState>(() => {
    const state: RowSelectionState = {};
    for (const item of items) {
      if (selectedIds.has(item.businessId)) {
        state[item.businessId] = true;
      }
    }
    return state;
  }, [items, selectedIds]);

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => {
          const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.businessId));
          const someSelected = items.some((item) => selectedIds.has(item.businessId));
          return (
            <Checkbox
              aria-label="Selecionar todas as empresas desta página"
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(checked) =>
                onSelectionChange(
                  items.map((item) => item.businessId),
                  checked === true,
                )
              }
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Selecionar ${row.original.name}`}
            checked={selectedIds.has(row.original.businessId)}
            onCheckedChange={(checked) => onSelectionChange([row.original.businessId], checked === true)}
          />
        ),
      }),
      columnHelper.accessor("name", {
        header: () => (
          <SortableHeader
            label="Nome"
            column="name"
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
          />
        ),
        cell: ({ row }) => (
          <Link
            href={`/businesses/${row.original.businessId}`}
            className="flex items-center gap-2 font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BusinessLogo name={row.original.name} websiteUrl={row.original.websiteUrl} className="size-7" />
            {row.original.name}
          </Link>
        ),
      }),
      columnHelper.display({
        id: "location",
        header: "Cidade",
        cell: ({ row }) =>
          [row.original.city, row.original.state].filter(Boolean).join("/") || (
            <span className="text-muted-foreground">—</span>
          ),
      }),
      columnHelper.display({
        id: "phone",
        header: "Telefone",
        cell: ({ row }) => {
          const phone = row.original.phone;
          if (!phone) return <span className="text-muted-foreground">—</span>;
          const digits = phone.replace(/\D/g, "");
          return (
            <div className="flex items-center gap-1.5">
              <span>{phone}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Copiar telefone"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => copyPhone(phone)}
                  >
                    <PiCopySimple aria-hidden />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copiar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`https://wa.me/${digits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir no WhatsApp"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <SiWhatsapp aria-hidden />
                  </a>
                </TooltipTrigger>
                <TooltipContent>WhatsApp</TooltipContent>
              </Tooltip>
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "website",
        header: () => (
          <WebsiteFilterHeader websiteFilter={websiteFilter} onWebsiteFilterChange={onWebsiteFilterChange} />
        ),
        cell: ({ row }) => <WebsiteBadge {...row.original} />,
      }),
      columnHelper.display({
        id: "rating",
        header: () => (
          <SortableHeader
            label="Avaliação"
            column="rating"
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
          />
        ),
        cell: ({ row }) =>
          row.original.rating !== null ? (
            <span className="flex items-center gap-1">
              <PiStar className="text-warning" aria-hidden />
              {row.original.rating.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}
              {row.original.reviewCount !== null ? (
                <span className="text-muted-foreground">({row.original.reviewCount})</span>
              ) : null}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      }),
      columnHelper.display({
        id: "score",
        header: () => (
          <SortableHeader
            label="Score"
            column="score"
            sortBy={sortBy}
            sortDir={sortDir}
            onSortChange={onSortChange}
          />
        ),
        cell: ({ row }) =>
          row.original.score !== null && row.original.scoreLevel !== null ? (
            <ScoreBadge level={row.original.scoreLevel} score={row.original.score} />
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "Ações",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={item.favorited ? "Desfavoritar" : "Favoritar"}
                    aria-pressed={item.favorited}
                    loading={favoritePendingId === item.businessId}
                    onClick={() => onToggleFavorite(item)}
                  >
                    {item.favorited ? (
                      <PiHeartFill className="text-destructive" aria-hidden />
                    ) : (
                      <PiHeart aria-hidden />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{item.favorited ? "Desfavoritar" : "Favoritar"}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Auditar site"
                    loading={auditPendingId === item.businessId}
                    disabled={!item.websiteUrl}
                    onClick={() => onAudit(item.businessId)}
                  >
                    <PiMagnifyingGlass aria-hidden />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {item.websiteUrl ? "Auditar site" : "Empresa sem site"}
                </TooltipContent>
              </Tooltip>
              {item.leadId ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label="Ver no pipeline" asChild>
                      <Link href={`/pipeline/${item.leadId}`}>
                        <PiKanban aria-hidden />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver no pipeline</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Adicionar ao pipeline"
                      loading={pipelinePendingId === item.businessId}
                      onClick={() => onAddToPipeline(item.businessId)}
                    >
                      <PiKanban aria-hidden />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Adicionar ao pipeline</TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      }),
    ],
    [
      items,
      selectedIds,
      onSelectionChange,
      favoritePendingId,
      onToggleFavorite,
      auditPendingId,
      onAudit,
      pipelinePendingId,
      onAddToPipeline,
      sortBy,
      sortDir,
      onSortChange,
      websiteFilter,
      onWebsiteFilterChange,
    ],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.businessId,
    state: { rowSelection },
    enableRowSelection: true,
  });

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={selectedIds.has(row.original.businessId) ? "selected" : undefined}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
