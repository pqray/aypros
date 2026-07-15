# 00 — Regras do Projeto

> Spec-base obrigatória. Deve ser lida antes de QUALQUER fase de implementação.

## 1. Regras de trabalho

1. Implementar **uma fase por vez** (ver `/specs/phases/`). Nunca avançar para a próxima fase sem aprovação explícita do usuário.
2. Antes de cada fase, ler somente: esta spec, a spec da fase atual e as specs de domínio listadas na seção "Specs-base para leitura" da fase.
3. Não instalar dependências de fases futuras.
4. Não executar mudanças destrutivas (drop de tabelas, deleção de arquivos não relacionados, rewrites de história git) sem confirmação.
5. As specs em `/specs` são a **fonte oficial de verdade**. Divergência entre código e spec deve ser resolvida atualizando um dos dois de forma consciente e registrada.
6. Decisões arquiteturais relevantes viram ADR em `/specs/decisions/` (formato no README daquela pasta).
7. Ao concluir uma fase: rodar lint, typecheck, testes e build; reportar erros, arquivos alterados e decisões tomadas; aguardar aprovação.

## 2. Stack oficial

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Framework | Next.js (App Router) + React + TypeScript strict |
| Estilo | Tailwind CSS + shadcn/ui + Radix UI + CVA + clsx + tailwind-merge |
| Ícones | React Icons (`pi` funcional, `si` marcas) |
| Banco/Auth/Storage | Supabase (PostgreSQL, Auth, Storage; Realtime só quando fizer sentido) |
| ORM | Drizzle |
| Validação | Zod (+ React Hook Form em formulários) |
| Dados no cliente | TanStack Query + TanStack Table |
| Estado de UI | Zustand (somente interface) |
| Tema | next-themes |
| Feedback | Sonner |
| Command palette | cmdk |
| Animação | Motion for React (estrutural) + tailwindcss-animate (micro) |
| IA | Groq |
| Testes | Vitest + Testing Library |
| Qualidade | ESLint + Prettier |

### Proibido usar

Redux, Prisma, NestJS, Express separado, styled-components, Emotion, qualquer CSS-in-JS, Material UI, Chakra UI, Ant Design, Bootstrap, múltiplas bibliotecas de ícones funcionais, Redis/BullMQ/RabbitMQ/Kafka/Kubernetes/microsserviços (fora do MVP — ver `18-roadmap.md`).

## 3. Idioma

- **Código** (variáveis, funções, tabelas, colunas, commits): inglês.
- **Interface do usuário**: português do Brasil (pt-BR).
- **Specs e ADRs**: português do Brasil.
- **Comentários de código**: inglês, e somente quando expressarem restrição que o código não mostra.

## 4. Qualidade de código

- TypeScript `strict: true`; proibido `any` (usar `unknown` + narrowing quando inevitável).
- Proibido `style={{ ... }}`, hex em componentes, classes arbitrárias tipo `bg-[#22223B]` (ver `03-design-system.md`).
- Proibido mocks em código de produção (mock de provider só em testes — ver `08-business-discovery.md`).
- Proibido números falsos/placeholder na UI: dashboards e métricas exibem dados reais ou empty states.
- Toda entrada externa (formulários, query params, respostas de providers, respostas da Groq) é validada com Zod antes de uso.
- Funções de domínio (scoring, parsing, normalização) são puras e testáveis.

## 5. Segurança (resumo — detalhes em `17-security.md`)

- RLS habilitado em todas as tabelas com dados de usuário/organização.
- `service_role` do Supabase nunca chega ao cliente; usado só em código server-side quando estritamente necessário.
- Toda URL analisada passa por proteção SSRF (ver `09-website-http-audit.md`).
- Secrets somente em variáveis de ambiente; nunca commitados; `.env.example` documenta as chaves sem valores.
- Logs não contêm secrets, tokens ou dados pessoais sensíveis.

## 6. Documentação

- Cada spec tem escopo único; informação compartilhada vive na spec-base apropriada e é **referenciada**, nunca copiada.
- Sem blocos enormes de código nas specs; usar tabelas e checklists.
- Ao tomar decisão que altera uma spec, atualizar a spec e, se relevante, criar ADR.
