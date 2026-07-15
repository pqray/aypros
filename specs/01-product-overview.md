# 01 — Visão do Produto

## Visão

Plataforma SaaS B2B de prospecção comercial para profissionais que vendem criação e reformulação de sites. Responde à pergunta central: **"Quais empresas eu deveria abordar primeiro para vender um site?"**

## Público

Desenvolvedores freelancers, web designers, pequenas agências e estúdios digitais que prospectam clientes locais.

## Problema

Prospecção manual é lenta: descobrir empresas de um segmento numa cidade, verificar uma a uma se têm site, avaliar a qualidade da presença digital e decidir quem abordar consome horas e não gera priorização objetiva.

## Proposta de valor

1. **Descoberta**: buscar empresas reais por cidade + segmento via provider externo.
2. **Diagnóstico**: identificar quem tem/não tem site e analisar o site por HTTP.
3. **Priorização**: score de oportunidade 0–100 com motivos e serviços sugeridos.
4. **Organização**: favoritos, pesquisas salvas, filtros salvos, pipeline Kanban, notas e atividades.
5. **Abordagem**: resumo comercial e mensagens de WhatsApp/e-mail geradas com Groq.

## Principais casos de uso

| # | Caso de uso |
|---|---|
| 1 | Buscar "restaurantes em Curitiba" e ver quais não têm site |
| 2 | Analisar o site de uma empresa e ver problemas detectáveis por HTTP |
| 3 | Ordenar resultados por score de oportunidade e favoritar os melhores |
| 4 | Mover leads por estágios do pipeline com notas e próxima ação |
| 5 | Gerar mensagem de WhatsApp personalizada para um lead |
| 6 | Exportar uma lista filtrada em CSV |

## Conceitos centrais

- **Empresa (business)**: estabelecimento real retornado por um provider de descoberta, com nome, endereço, telefone, avaliação, quantidade de avaliações e site (quando existir). Normalizada e deduplicada.
- **Pesquisa (search)**: execução de uma busca cidade + segmento, com estado (`pending` → `processing` → `completed`/`partial`/`failed`) e resultados associados.
- **Auditoria (audit)**: análise HTTP de um site em um momento no tempo; gera evidências e alimenta o score. Histórico preservado.
- **Oportunidade (score)**: número 0–100 + nível + confiança + motivos + serviços sugeridos, calculado a partir de dados da empresa e da auditoria.
- **Lead**: empresa adicionada ao pipeline de uma organização, com estágio, valor potencial, notas e atividades.

## Escopo do MVP

Autenticação; onboarding; organizações; dashboard; descoberta de empresas com provider real; análise HTTP; score comercial; tabela de empresas; página de detalhes; favoritos; pesquisas salvas; filtros salvos; pipeline; notas; atividades; histórico de análises; integração Groq; exportação CSV; light/dark theme; responsividade; acessibilidade; testes das partes críticas.

## Fora de escopo do MVP

Playwright/Chromium/screenshots/análise visual; Redis/BullMQ/RabbitMQ/Kafka/Kubernetes/microsserviços; PDF; envio automático de e-mail ou WhatsApp; billing/planos pagos; app mobile nativo; extensão de navegador; monitoramento contínuo; geração de sites/mockups; automações avançadas de CRM. Evolução futura em `18-roadmap.md`.
