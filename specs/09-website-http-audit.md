# 09 — Auditoria HTTP de Sites

Análise de sites **somente por HTTP** (fetch + parse de HTML estático). Sem browser, sem execução de JavaScript (Playwright é pós-MVP — `18-roadmap.md`). Serviço em `packages/integrations`, invocado server-side; resultados em `website_audits` (append-only, ver `04-database.md`).

## Normalização de URL

- Adicionar `https://` se sem esquema; tentar `https` primeiro, fallback `http` (registrar se só responde em http).
- Normalizar host (lowercase, sem porta padrão); preservar path.
- Rejeitar esquemas não-`http(s)`.

## Proteção SSRF (obrigatória — testes críticos em `16-testing.md`)

Antes de qualquer fetch:

1. Resolver DNS do host e validar **cada IP** resolvido.
2. Bloquear: IPs privados (10/8, 172.16/12, 192.168/16), loopback (127/8, ::1), link-local (169.254/16, fe80::/10), metadata (169.254.169.254), ULA/reservados.
3. Bloquear hosts literais de IP interno e `localhost`.
4. Revalidar a cada redirect (redirect para IP interno = bloqueio).
5. Limitar tamanho de resposta (ex.: 2 MB) e tipos aceitos.

## Parâmetros do fetch

| Parâmetro | Valor |
|---|---|
| Timeout total | 10s (conexão 5s) |
| Redirects | máx. 5, seguidos manualmente com revalidação SSRF; registrar cadeia e `redirect_count` |
| Content-type | processar apenas `text/html` (registrar outros como `non_html`) |
| User-Agent | identificável do produto |
| Método | GET (HEAD opcional como pré-verificação) |

## Detecções (a partir de status, headers e HTML estático)

- **Disponibilidade**: status final, tempo de resposta, site fora do ar, erro de certificado/SSL.
- **HTTPS**: usa https, redireciona http→https.
- **Metadados**: `<title>`, meta description, favicon, Open Graph, lang.
- **Responsividade (heurística)**: meta viewport presente.
- **Plataforma (heurística)**: generator/headers/paths conhecidos (WordPress, Wix, Squarespace, Shopify, etc.).
- **Presença digital**: links para redes sociais e WhatsApp encontrados no HTML.
- **Sinais de desatualização**: anos antigos no rodapé, tecnologias legadas detectáveis (heurístico).
- **Peso da página**: tamanho do HTML.

## Evidências e estados inconclusivos

- Cada detecção grava evidência (`evidence jsonb`): trecho/header/URL que a sustenta e um valor `detected | not_detected | inconclusive`.
- **Limitação estrutural**: sites renderizados por JavaScript (SPA) podem parecer vazios — se HTML < limiar e sinais de framework SPA, marcar detecções dependentes de conteúdo como `inconclusive`, nunca como "site ruim".
- Auditoria distingue: `completed` (análise feita, mesmo com site fora do ar — isso é um achado), `failed` (não foi possível analisar: SSRF bloqueado, timeout de rede nossa, erro interno).

## Execução

- Individual (página da empresa) ou em lote (pós-pesquisa), processando em série/pequena concorrência dentro dos limites serverless com estados no banco (`02-architecture.md`).
- Auditoria concluída dispara recálculo do score (`10-opportunity-scoring.md`) e atividade `audit_completed`.
