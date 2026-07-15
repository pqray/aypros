# 03 — Design System

Inspiração funcional: Apollo, Linear, Attio, Stripe (sem copiar). Aparência: premium, elegante, tecnológica, confiável, organizada, calma, profissional.

## Paleta Soft Lavender (valores SOMENTE nos tokens centrais)

| Nome | Hex | Papel |
|---|---|---|
| Space Indigo | `#22223B` | texto (light) / superfícies (dark) |
| Dusty Grape | `#4A4E69` | primary (light) |
| Lilac Ash | `#9A8C98` | primary (dark), detalhes |
| Almond Silk | `#C9ADA7` | detalhes, acentos suaves |
| Seashell | `#F2E9E4` | texto (dark), superfícies claras |

## Temas

| Token | Light | Dark |
|---|---|---|
| background | ~`#F7F4F2` | ~`#12121C` |
| card / surface | branco | Space Indigo |
| sidebar | superfície clara | ~`#181827` |
| foreground | Space Indigo | Seashell |
| primary | Dusty Grape | Lilac Ash |
| acentos/detalhes | Lilac Ash, Almond Silk | Almond Silk |

Tema controlado por `next-themes` (`class` no `<html>`), com toggle no shell e respeito à preferência do sistema.

## Cores semânticas

Definir tokens para: `success`, `warning`, `destructive`, `info` e níveis de oportunidade (`opportunity-low`, `opportunity-medium`, `opportunity-high`, `opportunity-very-high`). **Verde é reservado a success e oportunidades altas** — nunca decorativo.

## Tokens e implementação

- Valores hex vivem **apenas** em CSS variables (`globals.css` / preset Tailwind em `packages/config`).
- Tailwind mapeia variables para classes semânticas: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, etc.
- **Proibido**: `style={{}}`, hex em componentes, `bg-[#...]`, CSS-in-JS, styled-components, Emotion.
- Variantes com **CVA**; composição de classes com `cn()` centralizada (clsx + tailwind-merge) em `packages/ui`.

## Tipografia, spacing, radii, sombras

- Fonte sans moderna (ex.: Inter ou Geist via `next/font`) — decisão registrada em ADR na Fase 2.
- Escala tipográfica contida: títulos claros, corpo 14–16px, dados tabulares 13–14px com `tabular-nums`.
- Spacing na escala padrão do Tailwind (múltiplos de 4px); densidade média inspirada em Linear/Attio.
- Radii: `sm` para inputs/badges, `md` para cards/botões, `lg` para dialogs/drawers.
- Sombras sutis (1–2 níveis); no dark theme, preferir bordas e elevação por cor a sombras fortes.

## Estados

Todo componente interativo define: default, hover, active, focus-visible (anel visível usando token `ring`), disabled, loading. Estados de dados: loading (skeleton), empty (empty state com ação), error (mensagem + retry).

## Responsividade

Mobile-first. Breakpoints padrão do Tailwind. Sidebar vira drawer no mobile (ver `06-app-shell-navigation.md`); tabelas ganham scroll horizontal ou visualização de cards; Kanban rola horizontalmente.

## Acessibilidade

- Contraste WCAG AA mínimo em ambos os temas.
- Navegação completa por teclado; foco visível sempre.
- Radix UI como base de primitivas acessíveis.
- Botões só-ícone: `aria-label` + tooltip + foco visível.
- Respeitar `prefers-reduced-motion`.

## Ícones (React Icons)

- Família funcional oficial: `react-icons/pi` (Phosphor). Não misturar outras famílias em ícones funcionais.
- `react-icons/si` apenas para marcas: Google, Instagram, WhatsApp, LinkedIn, Facebook, Supabase, Groq.
- Sem emojis como ícones principais.
- Tamanhos consistentes (16/20/24) alinhados ao contexto.

## Animações

- **Motion for React**: apenas estrutural — sidebar, drawer, dialogs, dropdowns, accordions, cards, Kanban (drag), expansão de filtros, mudança de abas, progresso, feedback de sucesso.
- **CSS / tailwindcss-animate**: microinterações simples (hover, fade, spin de loading).
- Durações: micro 120–180ms; componentes 180–240ms; transições maiores até 300ms.
- **Evitar**: animações infinitas, partículas, parallax, 3D, bounce excessivo, grandes deslocamentos, animação em todas as linhas de tabela.
- `prefers-reduced-motion` desativa/reduz tudo que for não essencial.
