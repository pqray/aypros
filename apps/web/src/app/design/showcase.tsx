"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Label,
  PageHeader,
  ScoreBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  StatCard,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  toast,
} from "@aypros/ui";
import * as React from "react";
import {
  PiBuildings,
  PiChartLineUp,
  PiDotsThree,
  PiHeart,
  PiMagnifyingGlass,
  PiPlus,
  PiTrash,
} from "react-icons/pi";
import { SiGoogle, SiInstagram, SiWhatsapp } from "react-icons/si";
import { ThemeToggle } from "@/components/theme-toggle";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </section>
  );
}

export function DesignShowcase() {
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <PageHeader
          title="Design System"
          description="Showcase interno — paleta Soft Lavender, light e dark."
          actions={<ThemeToggle />}
        />

        <Section title="Botões">
          <Button>Primário</Button>
          <Button variant="secondary">Secundário</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Excluir</Button>
          <Button variant="link">Link</Button>
          <Button loading>Carregando</Button>
          <Button disabled>Desabilitado</Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Favoritar">
                <PiHeart aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Favoritar</TooltipContent>
          </Tooltip>
          <Button size="sm">
            <PiPlus aria-hidden /> Pequeno
          </Button>
          <Button size="lg">
            <PiMagnifyingGlass aria-hidden /> Grande
          </Button>
        </Section>

        <Section title="Badges e níveis de oportunidade">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="muted">Muted</Badge>
          <Badge variant="success">Sucesso</Badge>
          <Badge variant="warning">Alerta</Badge>
          <Badge variant="destructive">Erro</Badge>
          <Badge variant="info">Info</Badge>
          <ScoreBadge level="low" score={22} />
          <ScoreBadge level="medium" score={48} />
          <ScoreBadge level="high" score={71} />
          <ScoreBadge level="very_high" score={93} />
        </Section>

        <Section title="Cards e métricas">
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Empresas sem site"
              value={128}
              hint="nas últimas pesquisas"
              icon={<PiBuildings aria-hidden />}
            />
            <StatCard
              label="Score médio"
              value={64}
              hint="oportunidades ativas"
              icon={<PiChartLineUp aria-hidden />}
            />
            <Card>
              <CardHeader>
                <CardTitle>Padaria Estrela</CardTitle>
                <CardDescription>Curitiba · Padarias</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <ScoreBadge level="very_high" score={93} />
                <Badge variant="muted">sem site</Badge>
              </CardContent>
            </Card>
          </div>
        </Section>

        <Section title="Formulário">
          <div className="w-full max-w-sm space-y-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" placeholder="Ex.: Curitiba" />
            </div>
            <div className="space-y-2">
              <Label>Segmento</Label>
              <Select>
                <SelectTrigger aria-label="Segmento">
                  <SelectValue placeholder="Selecione um segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restaurantes">Restaurantes</SelectItem>
                  <SelectItem value="padarias">Padarias</SelectItem>
                  <SelectItem value="petshops">Pet shops</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Section>

        <Section title="Overlays">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Abrir dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salvar pesquisa</DialogTitle>
                <DialogDescription>Dê um nome para reutilizar esta pesquisa.</DialogDescription>
              </DialogHeader>
              <Input placeholder="Nome da pesquisa" />
              <DialogFooter>
                <Button>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Abrir drawer</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Detalhes do lead</SheetTitle>
                <SheetDescription>Prévia do drawer usado no pipeline.</SheetDescription>
              </SheetHeader>
            </SheetContent>
          </Sheet>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Mais ações">
                <PiDotsThree aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <PiHeart aria-hidden /> Favoritar
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <PiTrash aria-hidden /> Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={() => setConfirmOpen(true)}>
            Confirmação destrutiva
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Remover lead?"
            description="Esta ação não pode ser desfeita."
            confirmLabel="Remover"
            destructive
            onConfirm={() => {
              setConfirmOpen(false);
              toast.success("Lead removido (exemplo)");
            }}
          />

          <Button variant="outline" onClick={() => toast.success("Pesquisa concluída")}>
            Toast de sucesso
          </Button>
          <Button variant="outline" onClick={() => toast.error("Falha ao consultar o provider")}>
            Toast de erro
          </Button>
        </Section>

        <Section title="Tabs e accordion">
          <Tabs defaultValue="resumo" className="w-full max-w-md">
            <TabsList>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
            </TabsList>
            <TabsContent value="resumo" className="text-sm text-muted-foreground">
              Conteúdo do resumo.
            </TabsContent>
            <TabsContent value="auditoria" className="text-sm text-muted-foreground">
              Conteúdo da auditoria.
            </TabsContent>
            <TabsContent value="notas" className="text-sm text-muted-foreground">
              Conteúdo das notas.
            </TabsContent>
          </Tabs>
          <Accordion type="single" collapsible className="w-full max-w-md">
            <AccordionItem value="a">
              <AccordionTrigger>O que a auditoria HTTP detecta?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Disponibilidade, HTTPS, metadados, viewport e sinais de plataforma.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="b">
              <AccordionTrigger>O que é o score?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                Um número de 0 a 100 que prioriza empresas com presença digital fraca.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </Section>

        <Section title="Estados">
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <EmptyState
              icon={<PiMagnifyingGlass aria-hidden />}
              title="Nenhuma pesquisa ainda"
              description="Busque empresas por cidade e segmento para começar."
              action={
                <Button size="sm">
                  <PiPlus aria-hidden /> Nova pesquisa
                </Button>
              }
            />
            <div className="space-y-3 rounded-lg border p-4">
              <Skeleton className="h-5 w-2/5" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </Section>

        <Section title="Avatar e marcas (react-icons/si)">
          <Avatar>
            <AvatarFallback>RA</AvatarFallback>
          </Avatar>
          <div className="flex items-center gap-3 text-muted-foreground [&_svg]:size-5">
            <SiGoogle aria-label="Google" />
            <SiInstagram aria-label="Instagram" />
            <SiWhatsapp aria-label="WhatsApp" />
          </div>
        </Section>
      </div>
    </TooltipProvider>
  );
}
