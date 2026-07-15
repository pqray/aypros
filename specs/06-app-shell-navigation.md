# 06 — App Shell e Navegação

Layout do grupo `(app)`: sidebar fixa (desktop) + topbar + área de conteúdo. Estética conforme `03-design-system.md`.

## Estrutura de rotas

| Rota | Página |
|---|---|
| `/dashboard` | Dashboard |
| `/discovery` | Nova pesquisa + progresso + resultados |
| `/searches` | Pesquisas salvas / histórico de pesquisas |
| `/businesses` | Tabela de empresas (resultados agregados, filtros) |
| `/businesses/[id]` | Detalhe da empresa |
| `/favorites` | Favoritos |
| `/pipeline` | Kanban do pipeline |
| `/pipeline/[leadId]` | Detalhe do lead (ou drawer sobre o Kanban) |
| `/settings/profile` | Perfil |
| `/settings/organization` | Organização e membros |

## Sidebar

- Desktop: fixa, colapsável (ícones + tooltips quando colapsada); estado de colapso em Zustand + persistido.
- Seções: navegação principal (Dashboard, Descoberta, Empresas, Favoritos, Pipeline), seção secundária (Configurações), rodapé com org ativa e usuário.
- Item ativo destacado por rota atual; animação estrutural com Motion.

## Topbar

- Breadcrumbs derivados da rota (com nome dinâmico em páginas de detalhe).
- Botão da command palette (atalho visível), theme toggle, menu do usuário (perfil, organização, logout).

## Mobile

- Sidebar vira drawer (Radix Dialog/Sheet) aberto por botão hambúrguer na topbar; fecha ao navegar.
- Conteúdo em coluna única; tabelas e Kanban conforme `03-design-system.md`.

## Command palette (cmdk)

- Atalho `Cmd/Ctrl+K`; estado aberto/fechado em Zustand.
- MVP: navegação entre páginas + ações rápidas (nova pesquisa, alternar tema). Busca de empresas na palette é pós-MVP.

## Theme toggle

`next-themes`: light / dark / system. Ícone `pi` correspondente; sem flash de tema incorreto (script de tema no root layout).

## Estados de navegação

- `loading.tsx` com skeletons por rota principal.
- `error.tsx` com mensagem e retry.
- `not-found.tsx` para entidades inexistentes.
- Indicador de progresso em transições longas; foco gerenciado ao abrir/fechar drawers e dialogs.
