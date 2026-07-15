# Decisões de Arquitetura (ADRs)

Registro de decisões importantes do projeto. Um arquivo por decisão: `NNN-titulo-curto.md` (ex.: `001-discovery-provider.md`).

## Formato (ADR curto)

```markdown
# NNN — Título

- **Data**: AAAA-MM-DD
- **Status**: proposta | aceita | substituída por NNN | rejeitada

## Contexto
Por que a decisão foi necessária (2–5 linhas).

## Decisão
O que foi decidido.

## Alternativas consideradas
- Alternativa A — por que não.
- Alternativa B — por que não.

## Consequências
Efeitos positivos e negativos, migrações necessárias, o que fica mais difícil.
```

## Quando criar um ADR

- Escolha de provider/serviço externo (descoberta, modelo Groq, biblioteca de DnD, fonte tipográfica).
- Mudança de versão do algoritmo de scoring.
- Qualquer desvio de uma spec existente.
- Decisões com custo de reversão alto.

## Decisões pendentes (a resolver nas primeiras fases)

| # | Decisão | Fase |
|---|---|---|
| 1 | ~~Provider real de descoberta~~ — **resolvida**: Google Places API ([ADR 001](001-discovery-provider.md)) | 6 |
| 2 | Fonte tipográfica (Inter vs Geist) | 2 |
| 3 | Biblioteca de drag and drop do Kanban | 9 |
| 4 | Mecanismo de convite para organizações no MVP (adicionar por e-mail vs link de convite) | 3 |
| 5 | Plataforma de deploy — **proposta**: Vercel ([ADR 002](002-deploy-platform.md)), confirmar plano/limites até a Fase 6 | 1 |
