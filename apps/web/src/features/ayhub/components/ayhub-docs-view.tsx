"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, PageHeader, toast } from "@aypros/ui";
import Link from "next/link";
import type { ReactNode } from "react";
import { PiArrowLeft, PiCopy } from "react-icons/pi";

const LIB_CODE = `// lib/ayhub.ts
// Client de conteúdo do AYhub. Chamado só em Server Components — a SITE_KEY
// nunca deve chegar ao browser. Use \`export const revalidate = 60;\` (ou o
// valor combinado) na página/layout que chama getContent() para ISR.

type ContentBlocks = Record<string, unknown>;

const FALLBACK: ContentBlocks = {};

export async function getContent(): Promise<ContentBlocks> {
  const apiUrl = process.env.AYHUB_API_URL;
  const siteKey = process.env.AYHUB_SITE_KEY;

  if (!apiUrl || !siteKey) {
    console.warn("AYHUB_API_URL/AYHUB_SITE_KEY ausentes — usando fallback vazio.");
    return FALLBACK;
  }

  try {
    const response = await fetch(\`\${apiUrl}/v1/content\`, {
      headers: { Authorization: \`Bearer \${siteKey}\` },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(\`AYhub content fetch failed: \${response.status}\`);
      return FALLBACK;
    }

    const data = (await response.json()) as { blocks: ContentBlocks };
    return data.blocks ?? FALLBACK;
  } catch (error) {
    console.error("AYhub content fetch error:", error);
    return FALLBACK;
  }
}

type SeoMetadata = {
  title?: string;
  description?: string;
  openGraph?: { images?: string[] };
};

/** Formata o retorno de getContent() pronto para generateMetadata() do Next.js. */
export async function getSeoMetadata(): Promise<SeoMetadata> {
  const blocks = await getContent();
  const title = typeof blocks["seo.title"] === "string" ? (blocks["seo.title"] as string) : undefined;
  const description =
    typeof blocks["seo.description"] === "string" ? (blocks["seo.description"] as string) : undefined;
  const ogImage = typeof blocks["seo.og_image"] === "string" ? (blocks["seo.og_image"] as string) : undefined;

  return {
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(ogImage ? { openGraph: { images: [ogImage] } } : {}),
  };
}`;

const USAGE_CODE = `// app/page.tsx
import { getContent, getSeoMetadata } from "@/lib/ayhub";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getSeoMetadata();
}

export default async function HomePage() {
  const blocks = await getContent();
  const heroTitle = typeof blocks["hero.title"] === "string" ? blocks["hero.title"] : "";

  return <h1>{heroTitle}</h1>;
}`;

const SECTIONS = [
  { id: "visao-geral", label: "Visão geral" },
  { id: "clientes", label: "Clientes" },
  { id: "sites", label: "Sites" },
  { id: "custos", label: "Custos" },
  { id: "conteudo", label: "Conteúdo e SEO" },
  { id: "dashboard", label: "Dashboard" },
  { id: "conectar-site", label: "Conectar um site de cliente" },
] as const;

function CodeBlock({ code, label }: { code: string; label: string }) {
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Código copiado.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          <PiCopy aria-hidden />
          Copiar
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-md border bg-muted p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DocSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

function DocsNav() {
  return (
    <nav className="sticky top-4 hidden w-48 shrink-0 space-y-1 self-start lg:block" aria-label="Seções da documentação">
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          {section.label}
        </a>
      ))}
    </nav>
  );
}

export function AyhubDocsView() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Documentação"
        description="Como o AYhub funciona e como conectar um site de cliente."
        actions={
          <Button asChild variant="outline">
            <Link href="/ayhub">
              <PiArrowLeft aria-hidden />
              AYhub
            </Link>
          </Button>
        }
      />

      <div className="flex gap-6">
        <DocsNav />

        <div className="min-w-0 flex-1 space-y-4">
          <DocSection id="visao-geral" title="Visão geral">
            <p>
              O AYhub é o painel de pós-venda: gestão dos clientes e sites que você constrói e
              mantém, separado da parte de prospecção do Aypros (pipeline, buscas, empresas). Um
              cliente pode ter vários sites; cada site tem custos, conteúdo editável e uma chave
              própria (<Badge variant="outline">SITE_KEY</Badge>) para se comunicar com o site
              publicado.
            </p>
            <p>
              O fluxo típico: uma oportunidade vira <Badge variant="success">Ganho</Badge> na
              pipeline → um cliente é criado automaticamente aqui → quando o projeto é
              efetivamente entregue, você cria o site manualmente e configura o conteúdo.
            </p>
          </DocSection>

          <DocSection id="clientes" title="Clientes">
            <p>
              Um cliente tem nome, contato, valor de manutenção mensal e status (
              <Badge variant="success">Ativo</Badge>, <Badge variant="muted">Inativo</Badge>,{" "}
              <Badge variant="destructive">Inadimplente</Badge>). A <strong>origem</strong> mostra
              de onde ele veio:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <strong>Pipeline Aypros</strong> — criado automaticamente quando um lead vira
                &ldquo;Ganho&rdquo;. O valor de manutenção inicial vem do valor sugerido no estimador de custo
                da oportunidade, e a tela do cliente mostra um link de volta pra oportunidade de
                origem.
              </li>
              <li>
                <strong>Manual</strong> — cadastrado direto no AYhub, pelo botão &ldquo;Cadastrar
                cliente&rdquo; na lista. Para clientes que vieram fora da pipeline (indicação, contato
                direto).
              </li>
            </ul>
            <p>
              Um cliente nunca é apagado automaticamente: se a oportunidade de origem voltar de
              &ldquo;Ganho&rdquo; para outro status na pipeline, o cliente já criado no AYhub permanece.
            </p>
          </DocSection>

          <DocSection id="sites" title="Sites">
            <p>
              Um site pertence a um cliente e representa um projeto entregue (ou em andamento):
              slug, domínio, quem é responsável pelo domínio (você ou o cliente), data de entrega
              e status (<Badge variant="muted">Produção</Badge>,{" "}
              <Badge variant="muted">Manutenção</Badge>, <Badge variant="muted">Pausado</Badge>).
            </p>
            <p>
              Sites não são criados automaticamente — mesmo com o cliente vindo da pipeline, você
              cria o site manualmente quando o projeto é efetivamente entregue, pelo botão
              &ldquo;Adicionar site&rdquo; na tela do cliente.
            </p>
          </DocSection>

          <DocSection id="custos" title="Custos">
            <p>
              Cada site pode ter vários custos associados (domínio, hospedagem, storage, outro),
              com valor, periodicidade (mensal, anual, único) e responsável pelo pagamento. Um
              custo com renovação nos próximos 30 dias aparece com um selo de aviso na tela do
              site e no dashboard.
            </p>
            <p>Custos existentes só podem ser removidos, não editados — remova e crie de novo com o valor certo.</p>
          </DocSection>

          <DocSection id="conteudo" title="Conteúdo e SEO">
            <p>
              O conteúdo de um site é organizado em campos (chave livre, ex.: <code className="rounded bg-muted px-1 py-0.5 text-foreground">hero.title</code>). Três campos de SEO (
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">seo.title</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">seo.description</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">seo.og_image</code>) são
              criados automaticamente para todo site novo, numa aba própria.
            </p>
            <p>
              Todo campo guarda dois valores: <strong>rascunho</strong> (o que você está editando)
              e <strong>publicado</strong> (o que o site do cliente realmente recebe). Editar no
              painel nunca muda o publicado direto — é preciso clicar em &ldquo;Publicar alterações&rdquo; no
              site pra copiar o rascunho pro publicado. O botão &ldquo;Visualizar rascunho&rdquo; mostra lado a
              lado o que mudou e ainda não foi publicado.
            </p>
          </DocSection>

          <DocSection id="dashboard" title="Dashboard">
            <p>
              Visão consolidada de todos os clientes e sites: quantidade de sites ativos, MRR
              bruto (soma do valor de manutenção de todos os clientes ativos), MRR líquido (MRR
              bruto menos os custos recorrentes de todos os sites), alertas de renovação nos
              próximos 30 dias e margem por cliente (valor de manutenção menos custo mensal dos
              sites daquele cliente).
            </p>
          </DocSection>

          <DocSection id="conectar-site" title="Conectar um site de cliente">
            <p>
              Guia técnico: como ligar um site de cliente (projeto Next.js separado, hospedado no
              Vercel) ao AYhub, pra ele buscar o conteúdo publicado via{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-foreground">GET /v1/content</code>,
              autenticado por uma <Badge variant="outline">SITE_KEY</Badge> — nunca fala direto com
              o Supabase.
            </p>

            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">1. Criar o site e gerar a SITE_KEY</p>
                <p>
                  Na tela do cliente, crie o site (slug e domínio). Na tela de detalhe do site,
                  clique em &ldquo;Gerar nova&rdquo; chave. Ela aparece em texto puro só uma vez — copie antes
                  de fechar o diálogo. Gerar uma chave nova revoga a anterior automaticamente.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="font-medium text-foreground">2. Configurar variáveis de ambiente no Vercel</p>
                <p>No projeto do site de cliente (Vercel → Settings → Environment Variables):</p>
                <ul className="ml-4 list-disc space-y-1">
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-foreground">AYHUB_API_URL</code> —
                    URL da API do Aypros
                  </li>
                  <li>
                    <code className="rounded bg-muted px-1 py-0.5 text-foreground">AYHUB_SITE_KEY</code> —
                    a chave copiada no passo 1
                  </li>
                </ul>
                <p>
                  Nunca prefixe com{" "}
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">NEXT_PUBLIC_</code> — a
                  SITE_KEY só deve circular server-side.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="font-medium text-foreground">3. Copiar o client de conteúdo</p>
                <p>
                  Crie <code className="rounded bg-muted px-1 py-0.5 text-foreground">lib/ayhub.ts</code>{" "}
                  no projeto do site de cliente com este conteúdo:
                </p>
                <CodeBlock code={LIB_CODE} label="lib/ayhub.ts" />
              </div>

              <div className="space-y-1.5">
                <p className="font-medium text-foreground">4. Usar numa página</p>
                <CodeBlock code={USAGE_CODE} label="app/page.tsx" />
                <p>
                  <code className="rounded bg-muted px-1 py-0.5 text-foreground">getContent()</code>{" "}
                  sempre retorna o conteúdo publicado — o que está em rascunho no painel nunca
                  aparece no site. Se a chamada falhar, o fallback é um objeto vazio: trate cada
                  campo como potencialmente ausente.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="font-medium text-foreground">5. Fluxo de edição</p>
                <ol className="ml-4 list-decimal space-y-1">
                  <li>Edite os campos na aba de conteúdo (ou SEO) do site — grava só em rascunho.</li>
                  <li>Clique em &ldquo;Publicar alterações&rdquo; no site para copiar rascunho → publicado.</li>
                  <li>O site de cliente reflete a mudança no próximo revalidate (60s por padrão) — sem redeploy.</li>
                </ol>
              </div>
            </div>
          </DocSection>
        </div>
      </div>
    </div>
  );
}
