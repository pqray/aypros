# 009 - Biblioteca de PDF do diagnóstico

- **Data**: 2026-07-17
- **Status**: aceita

## Contexto

A Fase 14 precisa gerar PDFs server-side a partir de dados do banco, sem screenshots e sem dependência de browser no MVP. O relatório deve ser simples, determinístico e seguro para rodar dentro do `apps/api`.

## Decisão

Usar `pdfkit` no `apps/api` para montar o PDF diretamente no backend Node/Fastify.

## Alternativas consideradas

- `@react-pdf/renderer` - bom para templates declarativos, mas adiciona um modelo React separado no backend para um relatório simples.
- Playwright/print - gera fidelidade visual maior, mas exige browser, aumenta custo operacional e fica melhor junto com screenshots no roadmap.

## Consequencias

O MVP ganha geração leve, server-side e sem browser. O custo e que o layout e mais manual; se o relatório evoluir para muitas páginas/branding customizado, pode ser revisitado.
