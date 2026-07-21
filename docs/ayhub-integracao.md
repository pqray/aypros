# Conectar um site de cliente ao AYhub

O AYhub gerencia conteúdo (textos, SEO) de sites de cliente que rodam como projetos Next.js
**separados** deste monorepo, hospedados no Vercel. Cada site busca seu conteúdo publicado via
`GET /v1/content`, autenticado por uma `SITE_KEY` própria — nunca fala direto com o Supabase.

Como os sites de cliente vivem em repositórios próprios (fora deste pnpm workspace), o client de
consumo não é um pacote instalável — é um arquivo pequeno (`lib/ayhub.ts`) que você copia para
cada novo projeto. O conteúdo completo está na seção [3](#3-copiar-o-client-de-conteúdo) abaixo.

## 1. Criar o site no painel

No AYhub (`/ayhub`), abra o cliente correspondente e crie o site (slug, domínio). Na tela de
detalhe do site, clique em **Gerar SITE_KEY**. A chave em texto puro aparece **uma única vez** —
copie antes de fechar o diálogo. Gerar uma nova chave revoga automaticamente a anterior.

## 2. Configurar variáveis de ambiente no Vercel

No projeto do site de cliente (Vercel → Settings → Environment Variables):

| Variável | Valor |
|---|---|
| `AYHUB_API_URL` | URL da API do Aypros (ex.: `https://api.aypros.com`) |
| `AYHUB_SITE_KEY` | a chave copiada no passo 1 |

Nunca prefixe essas variáveis com `NEXT_PUBLIC_` — a `SITE_KEY` só deve circular server-side.

## 3. Copiar o client de conteúdo

Crie `lib/ayhub.ts` no projeto do site de cliente com o conteúdo abaixo:

```ts
// lib/ayhub.ts
// Client de conteúdo do AYhub. Chamado só em Server Components — a SITE_KEY
// nunca deve chegar ao browser. Use `export const revalidate = 60;` (ou o
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
    const response = await fetch(`${apiUrl}/v1/content`, {
      headers: { Authorization: `Bearer ${siteKey}` },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      console.error(`AYhub content fetch failed: ${response.status}`);
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
}
```

## 4. Usar em uma página

```tsx
// app/page.tsx
import { getContent, getSeoMetadata } from "@/lib/ayhub";
import type { Metadata } from "next";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  return getSeoMetadata();
}

export default async function HomePage() {
  const blocks = await getContent();
  const heroTitulo = typeof blocks["hero.titulo"] === "string" ? blocks["hero.titulo"] : "";

  return <h1>{heroTitulo}</h1>;
}
```

`getContent()` sempre retorna `valor_publicado` — o que está em rascunho no painel nunca aparece
no site. Se a chamada falhar (rede, chave revogada, etc.), o fallback é um objeto vazio: trate
cada campo como potencialmente ausente.

## 5. Fluxo de edição

1. No AYhub, edite os campos na aba de conteúdo (ou SEO) do site — toda edição grava só em
   rascunho.
2. Clique em **Publicar alterações** no site para copiar rascunho → publicado.
3. O site de cliente reflete a mudança no próximo `revalidate` (60s por padrão) — sem redeploy.
