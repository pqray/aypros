# Fase 14 — Relatório de diagnóstico (PDF)

## Objetivo

Transformar auditoria + score em um PDF de diagnóstico apresentável ao dono do negócio: linguagem de cliente (não técnica), identidade da organização do usuário, e pronto pra anexar em proposta ou usar como isca ("análise gratuita").

## Specs-base para leitura

`00-project-rules.md`, `09-website-http-audit.md` (detecções/evidências), `10-opportunity-scoring.md` (motivos), `11-businesses-and-favorites.md` (detalhe da empresa), `17-security.md` (rate limiting), `03-design-system.md` (o PDF segue a paleta/tipografia do produto).

## Dependências (instalar nesta fase)

Biblioteca de geração de PDF server-side — decisão em ADR nesta fase (candidatas: `@react-pdf/renderer`, `pdfkit`; Playwright/print fica pro roadmap junto com screenshots).

## Arquivos esperados

- ADR 009: biblioteca de PDF.
- `apps/api/src/reports.ts`: `GET /v1/businesses/:businessId/report.pdf` — monta o conteúdo do banco (empresa + última auditoria + último score), rate limit por org, atividade `export_created`.
- Camada de tradução **determinística** detecção→texto de cliente (ex.: `hasViewport not_detected` → "seu site não se adapta ao celular — a maioria dos seus clientes chega por ele"). Sem IA no conteúdo do MVP: texto por template com fatos interpolados (nada de inventar).
- Template do PDF: capa (empresa + org do usuário), sumário do diagnóstico, achados com explicação e impacto, sugestões de serviço, rodapé com contato do usuário.
- Web: botão "Baixar diagnóstico (PDF)" no detalhe da empresa e no lead.

## Tarefas

1. ADR 009 e instalação da lib escolhida.
2. Dicionário detecção/motivo→texto de cliente (pt-BR, tom consultivo, zero jargão) — revisável pelo usuário antes de fechar a fase.
3. Montagem do conteúdo (server-side, service role, mesmas checagens de acesso das rotas de negócio).
4. Renderização do PDF com identidade visual (tokens da paleta, Geist quando embutível).
5. Rota com rate limit (N/hora por org, `packages/config`) + atividade.
6. Botões na UI com estado de download.

## Critérios de aceite

- [ ] PDF gerado só com fatos do banco; achados `inconclusive` aparecem como "não verificado", nunca como problema
- [ ] Empresa sem site gera relatório focado em presença digital (não um PDF vazio)
- [ ] Linguagem 100% de dono de negócio (validada pelo usuário em 2–3 empresas reais)
- [ ] Rate limit ativo; download registra atividade
- [ ] Sem dado de outra organização acessível pela rota (checagem de acesso igual às demais)

## Testes necessários

P1: tradução detecção→texto (tabela: cada detecção/estado → texto esperado, inconclusive nunca vira afirmação); montagem do conteúdo com/sem auditoria/score. P2: rota (status, content-type, acesso negado).

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + gerar PDFs de 2–3 empresas reais (com site ruim, sem site, com site ok) e revisar com o usuário.

## Fora do escopo

Screenshots no relatório (roadmap: Playwright), white label/logo customizado da agência, envio do PDF por e-mail, comparação com concorrentes.

## Riscos

Texto genérico demais que soa automático — mitigar interpolando fatos concretos (nota, nº de avaliações, achados); fontes/emoji no PDF — validar renderização cedo.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] PDFs reais revisados e aprovados pelo usuário
- [ ] Aprovação explícita antes da próxima fase
