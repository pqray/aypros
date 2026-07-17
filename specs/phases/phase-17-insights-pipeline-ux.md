# Fase 17 — Insights comerciais e UX do pipeline

## Objetivo

Transformar a IA e o pipeline de "rascunhos simples + Kanban funcional" em uma experiência consultiva: diagnóstico mais profundo, abordagem comercial mais convincente, métricas visuais, PDF mais apresentável e detalhe do lead mais organizado para uso diário.

Esta fase também corrige problemas de usabilidade imediatos no pipeline: PATCH bloqueado por CORS, feedback/drag fraco, excesso de menu de três pontos, remoção de leads do pipeline e textos/labels visuais poluídos.

## Status atual

Implementada tecnicamente em julho/2026. A validação automatizada passou com `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` e rebuild Docker da API quando houve mudança backend.

Commits principais:

- `c442e99` — implementação base da Fase 17.
- `661e028` — feedback imediato de navegação.
- `c655cb4` — tabs persistentes por URL, diagnóstico na visão geral, métricas visuais e rebuild.
- `199d614` — polimento da experiência de IA/insights, `email-v4`, relatório amigável para bloqueio 403.
- `ad9d680` / `ede5ef9` — normalização de copy em português.

Validação manual ainda deve cobrir os fluxos listados em "Fluxo manual obrigatório".

## Specs-base para leitura

`00-project-rules.md`, `03-design-system.md`, `10-opportunity-scoring.md`, `12-pipeline-crm.md`, `13-ai-groq.md`, `14-data-fetching-state.md`, `17-security.md`, `19-backend-api.md`, `20-data-refresh.md`.

## Problemas levantados

- O resumo comercial gerado pela IA está raso: lista dores óbvias, mas não explica contexto, hipótese comercial, prioridade, risco e próximo passo.
- A geração não deixa claro onde entram Instagram, Linktree, delivery, presença social e dependência de canais de terceiros.
- O e-mail/WhatsApp precisam parecer mais consultivos e incorporados, não apenas um template curto.
- O PDF precisa evoluir para uma análise mais rica, com seções, gráficos simples e leitura de oportunidade.
- A UX do detalhe do lead mistura campos, score em badge solta, timeline e ações, deixando a tela pouco fluida.
- Mudar estágio/status no lead não está agradável.
- O menu de três pontos "Mover para..." no card do Kanban deve sair; o drag/drop e controles claros no detalhe devem bastar.
- O drag está com animação ruim e PATCH falha por CORS:
  `Method PATCH is not allowed by Access-Control-Allow-Methods in preflight response`.
- Usuário precisa conseguir remover um lead do pipeline.
- Remover o texto "Ações da empresa" da UI.

## Escopo P0 — Correções imediatas

1. Corrigir CORS do `apps/api` para aceitar `PATCH` e `DELETE` no preflight, mantendo `WEB_ORIGINS` restrito.
2. Adicionar endpoint para remover lead do pipeline:
   - Preferência MVP: `DELETE /v1/leads/:id` arquiva/remove o lead do pipeline da organização, sem apagar a empresa.
   - Registrar atividade `lead_archived` ou equivalente.
   - Kanban deve invalidar/atualizar otimisticamente.
3. Remover o menu de três pontos "Mover para..." do card do Kanban.
4. Melhorar animação/estado do drag:
   - card arrastado com escala/sombra sutil;
   - coluna destino com destaque claro;
   - rollback com toast em erro;
   - sem flicker após drop.
5. Remover o texto "Ações da empresa" e trocar por agrupamento visual mais discreto.

## Escopo P1 — Redesign do detalhe do lead

Reorganizar `/pipeline/[leadId]` em tabs ou seções claras:

- **Lead**: dados comerciais principais, estágio, responsável, valor, próxima ação, contato.
- **Abordagem com IA**: diagnóstico comercial, WhatsApp, e-mail, histórico das gerações.
- **Notas**: notas com CRUD.
- **Atividades**: sair do corpo principal e abrir como drawer/timeline lateral.

Diretrizes:

- Estágio deve ser um controle visível e direto, não escondido em menu.
- Status comercial deve ter copy clara: ativo, ganho, perdido, arquivado.
- Score não deve aparecer como tag solta no meio dos campos; deve virar um bloco de "Potencial" com score, confiança e principais motivos.
- Campos editáveis devem manter ritmo visual consistente.
- Ações destrutivas ("Remover do pipeline") exigem confirmação.

## Escopo P2 — Página/área de métricas da empresa

Criar uma visão mais rica para a empresa, preferencialmente dentro de `/businesses/[id]` com tabs:

- **Visão geral**: identidade, contatos, site, presença digital, frescor dos dados.
- **Métricas**: score, confiança, motivos, auditoria HTTP, presença social detectada, sinais de segmento.
- **Abordagem IA**: diagnóstico comercial, WhatsApp, e-mail.
- **Resumo da oportunidade**: diagnóstico comercial direto na visão geral, com botão opcional para baixar PDF.

Alternativa aceitável: uma página dedicada de insights se a tela de empresa ficar grande demais. A navegação deve continuar simples a partir da empresa e do lead.

## Escopo P3 — IA consultiva v2/v4

Evoluir os prompts e o contrato de saída para versões imutáveis por kind.

Versões atuais:

- `commercial_summary`: `summary-v2`.
- `whatsapp_message`: `whatsapp-v2`.
- `email_message`: `email-v4`.

### Resumo comercial v2

Deve sair de:

> Dores prováveis: falta de site, dificuldade de ser encontrada.

Para uma análise estruturada:

- contexto do negócio;
- presença digital observada;
- sinais fortes, sinais fracos e lacunas;
- hipótese sobre dependência de Instagram/Google/WhatsApp quando aplicável;
- impacto comercial provável;
- oferta recomendada;
- ângulo de abordagem;
- objeções esperadas;
- próximo passo sugerido.

Regras:

- Só citar Instagram, Linktree, iFood, delivery, WhatsApp ou rede social se houver sinal detectado nos dados.
- Se não houver dado social, a IA pode dizer "não há evidência salva de canal social próprio", mas não pode inventar perfil, seguidores ou frequência de posts.
- Para métricas reais de Instagram (seguidores, posts, engajamento), manter fora do MVP sem provider externo pago.

### E-mail v4

O e-mail deve ter:

- assunto consultivo;
- abertura contextual curta;
- 2 a 3 achados objetivos, explicando por que importam;
- proposta de valor concreta;
- CTA leve;
- tom profissional, sem parecer disparo em massa.
- corpo estruturado em 5 a 6 parágrafos separados por linha em branco;
- mínimo de 450 caracteres e rejeição de corpo longo sem parágrafos reais.

### WhatsApp v2

Mais curto que e-mail, mas ainda contextual:

- mencionar um achado real;
- abrir conversa, não "vender site" direto;
- evitar texto longo demais.

## Escopo P4 — PDF de diagnóstico v2

Melhorar o PDF para parecer uma análise real:

- capa com empresa e organização;
- resumo executivo;
- gráfico simples de score/potencial;
- blocos de presença digital: site, SEO básico, mobile, performance, confiança;
- sinais sociais/segmento quando detectados;
- motivos do score em linguagem de cliente;
- recomendações por prioridade;
- próximos passos sugeridos.

Gráficos permitidos no MVP:

- barra de score;
- radar/lista de maturidade digital por eixo;
- cards de prioridade.

Sem screenshots/IA visual nesta fase, salvo se um provider/renderizador for promovido com ADR próprio.

## Instagram e presença social

Separar três níveis:

1. **Detectado agora**: links para Instagram, Linktree, WhatsApp, delivery ou redes encontrados no site/dados salvos.
2. **Inferido com cautela**: empresa sem site próprio mas com sinais de canal terceiro; a IA pode tratar como dependência provável, não fato absoluto.
3. **Métrica externa**: seguidores, frequência de posts, engajamento. Só entra com provider externo pago e spec própria; sem scraping direto.

Implementado no app:

- `socialOnly/socialPlatform` preservados desde discovery/refresh para distinguir Instagram/rede social de site próprio.
- Auditoria HTML gera detecção explícita `instagram`, além de `socialLinks`.
- Empresas/listagem exibem badges `Instagram`/`Redes sociais`; detalhe da empresa mostra canal social principal quando aplicável.
- Score, IA e PDF recebem os sinais sociais estruturados; Instagram só é citado com evidência salva.
- Maturidade digital inclui eixo `Presença social`.

## Arquivos esperados

- `apps/api/src/app.ts`: CORS com métodos corretos.
- `apps/api/src/leads.ts`: remoção/arquivamento de lead e atividade.
- `packages/types`, `packages/validation`: contratos novos, se necessário.
- `apps/web/src/features/pipeline/*`: redesign do detalhe, remover menu do card, drag mais polido, remover lead.
- `apps/web/src/features/businesses/*`: tabs de visão geral/métricas/IA, resumo de oportunidade e botão de PDF.
- `packages/integrations/src/ai/*`: prompts versionados e schemas de saída.
- `apps/api/src/ai.ts`: persistir `prompt_version` por kind e montar input enriquecido.
- `apps/api/src/reports.ts`: PDF v2 com seções e gráficos simples.
- Testes de UI, prompts e API.

## Critérios de aceite

- [x] PATCH/DELETE do pipeline não falham em CORS no navegador.
- [x] Arrastar lead move imediatamente, tem animação mais clara e rollback em erro.
- [x] Card do Kanban não tem menu de três pontos para mover estágio.
- [x] Usuário consegue remover lead do pipeline com confirmação.
- [x] Detalhe do lead tem tabs/seções claras e score integrado ao bloco de potencial.
- [x] Atividades ficam organizadas em timeline/drawer sem competir com campos principais.
- [x] IA v2 gera resumo mais profundo e cita presença social apenas quando houver evidência.
- [x] E-mail v4 fica mais consultivo, contextual e validado por parágrafos.
- [x] PDF v2 inclui resumo executivo, métricas visuais e recomendações priorizadas.
- [x] "Ações da empresa" removido ou substituído por agrupamento visual discreto.
- [x] Instagram/presença social aparecem como sinal explícito na UX, score, IA e PDF sem inventar métricas externas.

## Testes necessários

P0:

- CORS preflight para `PATCH` e `DELETE`.
- API de remover/arquivar lead com autorização por organização.
- Mutação otimista do Kanban com rollback.

P1:

- Componentes do detalhe do lead: tabs, edição de estágio/status, remoção com confirmação.
- Card do Kanban sem menu de mover.

P2/P3:

- Prompt/schema da IA v2: com site, sem site, com sinal de Instagram/link-in-bio, sem sinal social.
- Garantir que a IA não inventa seguidores, posts ou rede social.

P4:

- Modelo do PDF com empresa sem site, empresa com site ruim e empresa com sinais sociais/segmento.

## Comandos de validação

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

Fluxo manual obrigatório:

1. Abrir `/pipeline`, arrastar lead entre colunas e confirmar que não há erro de CORS.
2. Remover lead do pipeline e confirmar que ele some do Kanban sem apagar a empresa.
3. Abrir detalhe do lead e revisar tabs/campos/score.
4. Gerar resumo, WhatsApp e e-mail de uma empresa sem site.
5. Gerar resumo de uma empresa com sinais sociais/segmento e conferir que a IA cita só fatos detectados.
6. Baixar PDF e revisar leitura visual.

## Fora do escopo

- Scraping direto de Instagram.
- Métricas reais de seguidores/posts sem provider externo pago.
- Envio automático de WhatsApp/e-mail.
- Estágios customizáveis.
- Screenshots e IA visual do site.

## Riscos

- IA ficar verbosa demais: mitigar com schema e limite de tamanho por seção.
- IA inventar rede social: mitigar com input estruturado e testes de prompt.
- Redesign virar refactor grande: começar pelo detalhe do lead e só depois expandir empresa/PDF.
- Remoção de lead confundir com apagar empresa: copy deve dizer "Remover do pipeline", não "Excluir empresa".

## Checklist de conclusão

- [x] P0 corrigido e coberto por validação técnica.
- [ ] UX do lead aprovada manualmente.
- [ ] Gerações IA revisadas em 3 exemplos reais.
- [ ] PDF v2 revisado em 2–3 empresas reais.
