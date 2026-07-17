# 18 — Roadmap Pós-MVP

Nada daqui entra no MVP. Ordem indicativa, não compromisso. Cada item, ao ser iniciado, ganha spec própria + ADR.

## Análise avançada de sites

- **Playwright + Chromium**: renderização real, resolvendo o limite de SPAs da auditoria HTTP (`09`).
- **Screenshots**: captura desktop/mobile armazenada no Supabase Storage; exibida na página da empresa.
- **IA visual**: avaliação de design/UX a partir do screenshot; enriquece score e abordagens.

## Infraestrutura de processamento

- **Worker dedicado + BullMQ + Redis**: extrair pesquisa/auditoria/IA para filas quando o volume estourar os limites serverless. Estados no banco permanecem os mesmos (`02-architecture.md`) — migração transparente para a UI. Rate limiting migra do banco para Redis.

## Comercial e produto

- **Billing / planos pagos**: Stripe; limites por plano (pesquisas, auditorias, IA) substituindo os limites fixos atuais.
- **Outbound**: envio real de e-mails (provider transacional) e integração WhatsApp; sequências simples de follow-up.
- **Relatórios avançados / white label**: o PDF básico de diagnóstico foi entregue nas Fases 14/17; ficam para pós-MVP branding customizado, domínio próprio, templates e anexos para proposta.
- **Monitoramento contínuo + alertas**: ~~reauditar sites periodicamente~~ (promovido: Fase 12 / `20-data-refresh.md`); resta a parte de alertas de mudanças (site caiu, concorrente lançou site).
- **Extensão de navegador**: capturar empresa/lead navegando no Google Maps.
- **Métricas de Instagram**: seguidores/frequência de posts via serviço externo pago (Apify ou similar) — a detecção de presença social/link-in-bio sem scraping foi promovida para a Fase 15; a leitura consultiva desses sinais na IA foi promovida para a Fase 17.
- **Geração de mockups**: prévia de site proposto para usar na abordagem.
- **CRM avançado**: estágios customizáveis, automações, campos personalizados, múltiplos pipelines. Polimento do pipeline atual foi promovido para a Fase 17.

## Critério para promover item do roadmap

Demanda real de usuários + capacidade de manter o MVP estável. Nunca iniciar item do roadmap no meio de uma fase do MVP.
