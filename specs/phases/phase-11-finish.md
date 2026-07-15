# Fase 11 — Finalização

## Objetivo

Passe final de qualidade sobre o produto completo: acessibilidade, responsividade, estados de erro/empty, consistência visual, revisão de segurança, testes faltantes e documentação. Nenhuma feature nova.

## Specs-base para leitura

`00-project-rules.md`, `16-testing.md`, `17-security.md`, `03-design-system.md`. As demais specs apenas como consulta pontual ao revisar cada área.

## Dependências (instalar nesta fase)

Nenhuma nova.

## Arquivos esperados

Correções distribuídas; `docs/` com README de setup (env vars, Supabase, rodar local); `.env.example` completo e correto.

## Tarefas

1. **Acessibilidade**: varredura por teclado em todos os fluxos; `aria-label` em só-ícone; contraste nos dois temas; `prefers-reduced-motion`.
2. **Responsividade**: todos os fluxos em 360px, 768px, 1280px.
3. **Estados**: toda página com loading/empty/error decentes; nenhuma métrica falsa remanescente.
4. **Consistência**: caça a hex/inline styles/famílias de ícone erradas (grep no CI local); durações de animação.
5. **Segurança**: revisão RLS com 2 orgs; checagem de secrets no bundle client; limites de rate ativos; CSV escaping.
6. **Testes**: completar P0/P1 pendentes de `16-testing.md`; suíte inteira verde.
7. **Dashboard revisitado**: blocos que dependiam de fases posteriores (oportunidades, atividades) validados com dados reais.
8. **Docs**: setup local documentado; specs atualizadas onde a implementação divergiu (com ADR quando relevante).

## Critérios de aceite

- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` verdes na raiz
- [ ] Zero hex/inline style fora dos tokens (verificado por busca)
- [ ] Fluxo completo (cadastro → onboarding → pesquisa → auditoria → favoritar → pipeline → IA → CSV) executado sem erros nos dois temas, desktop e mobile
- [ ] RLS validado com duas organizações
- [ ] Specs e decisões pendentes do `decisions/README.md` todas resolvidas ou explicitamente adiadas

## Testes necessários

Fechamento de todas as prioridades P0/P1 de `16-testing.md`; P2 no que for viável.

## Comandos de validação

Suíte completa + roteiro manual de ponta a ponta descrito acima.

## Fora do escopo

Qualquer item de `18-roadmap.md`; refatorações não motivadas por defeito.

## Riscos

Tentação de escopo extra — esta fase só corrige e consolida; achados grandes viram ADR/roadmap, não implementação de última hora.

## Checklist de conclusão

- [ ] Critérios verificados
- [ ] Roteiro E2E manual executado e reportado
- [ ] MVP declarado concluído — aguardar direcionamento do usuário
