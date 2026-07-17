---
name: nova-fase
description: Cria a spec de uma nova fase em specs/phases/ seguindo o template do projeto e atualiza os índices.
---

# Nova fase

Cria `specs/phases/phase-NN-<slug>.md` seguindo exatamente o processo do projeto.

## Passos

1. Ler `specs/README.md` (índices) e a última fase existente em `specs/phases/` para descobrir o próximo número `NN` e imitar o estilo.
2. Perguntar ao usuário (se não estiver claro no pedido): objetivo da fase e escopo aproximado. **Não** inventar escopo.
3. Escrever `specs/phases/phase-NN-<slug>.md` com TODAS as seções do template, nesta ordem:
   - `# Fase NN — Título`
   - `## Objetivo` — 1 a 3 linhas, sem lista de features.
   - `## Specs-base para leitura` — somente as specs de domínio realmente necessárias (`00-project-rules.md` sempre). Se a fase precisa de uma spec de domínio nova, criá-la também (`specs/NN-*.md`) e listá-la aqui.
   - `## Dependências (instalar nesta fase)` — pacotes novos ou "Nenhuma nova".
   - `## Arquivos esperados` — caminhos concretos por package/app.
   - `## Tarefas` — numeradas, ordenadas por dependência.
   - `## Critérios de aceite` — checkboxes objetivos e verificáveis.
   - `## Testes necessários` — mapear para P0/P1/P2 de `specs/16-testing.md`.
   - `## Comandos de validação` — no mínimo `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` + validação manual específica.
   - `## Fora do escopo` — o que fica para depois (citar `18-roadmap.md` quando aplicável).
   - `## Riscos`
   - `## Checklist de conclusão` — sempre terminar com aprovação explícita do usuário antes da fase seguinte.
4. Atualizar o índice de fases em `specs/README.md` (tabela "Índice — fases").
5. Se a fase envolve decisão arquitetural em aberto (lib, provider, mecanismo), listar na tabela de pendências de `specs/decisions/README.md` apontando a fase.

## Regras

- Uma fase = um escopo fechado. Se o pedido couber em duas fases, propor a divisão antes de escrever.
- Nada de implementação nesta skill — só a spec.
- A fase só começa a ser implementada com aprovação explícita do usuário (`specs/00-project-rules.md`).
