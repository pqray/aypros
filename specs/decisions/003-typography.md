# 003 — Tipografia: Geist

- **Data**: 2026-07-15
- **Status**: aceita

## Contexto

A spec `03-design-system.md` pedia uma fonte sans moderna via `next/font`, com decisão entre Inter e Geist na Fase 2.

## Decisão

**Geist** (+ Geist Mono para dados/código), carregada via `next/font/google` com variáveis `--font-geist-sans` / `--font-geist-mono` mapeadas nos tokens do Tailwind.

## Alternativas consideradas

- **Inter** — excelente, porém onipresente; Geist entrega o mesmo nível de legibilidade em UI com personalidade mais alinhada à estética pretendida (Linear/Vercel-like, premium e tecnológica).

## Consequências

- `tabular-nums` disponível para dados tabulares (Geist suporta).
- Troca futura é trivial: apenas o `layout.tsx` e o token `--font-sans` mudam.
