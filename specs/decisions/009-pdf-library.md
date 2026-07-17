# 009 - Biblioteca de PDF do diagnostico

- **Data**: 2026-07-17
- **Status**: aceita

## Contexto

A Fase 14 precisa gerar PDFs server-side a partir de dados do banco, sem screenshots e sem dependencia de browser no MVP. O relatorio deve ser simples, deterministico e seguro para rodar dentro do `apps/api`.

## Decisao

Usar `pdfkit` no `apps/api` para montar o PDF diretamente no backend Node/Fastify.

## Alternativas consideradas

- `@react-pdf/renderer` - bom para templates declarativos, mas adiciona um modelo React separado no backend para um relatorio simples.
- Playwright/print - gera fidelidade visual maior, mas exige browser, aumenta custo operacional e fica melhor junto com screenshots no roadmap.

## Consequencias

O MVP ganha geracao leve, server-side e sem browser. O custo e que o layout e mais manual; se o relatorio evoluir para muitas paginas/branding customizado, pode ser revisitado.
