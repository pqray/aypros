---
name: adr
description: Cria um ADR numerado em specs/decisions/ no formato do projeto e atualiza o índice de decisões pendentes.
---

# ADR

Registra uma decisão de arquitetura em `specs/decisions/NNN-<slug>.md`.

## Passos

1. Ler `specs/decisions/README.md` e listar os arquivos existentes para descobrir o próximo número `NNN`.
2. Escrever o ADR com o template exato do README de decisões:
   - `# NNN — Título`
   - `- **Data**: AAAA-MM-DD` (data de hoje)
   - `- **Status**: proposta | aceita | substituída por NNN | rejeitada`
   - `## Contexto` — por que a decisão foi necessária (2–5 linhas).
   - `## Decisão` — o que foi decidido, direto.
   - `## Alternativas consideradas` — cada alternativa com o motivo de não ter sido escolhida.
   - `## Consequências` — efeitos positivos e negativos, migrações, o que fica mais difícil.
3. Se a decisão estava na tabela "Decisões pendentes" do README, marcá-la como resolvida (riscado + link pro ADR), imitando as linhas já resolvidas.
4. Se a decisão diverge de uma spec de domínio existente, atualizar a spec no mesmo turno e citar o ADR nela.

## Quando usar

- Escolha de provider/serviço externo ou biblioteca com custo de troca alto.
- Mudança de versão do algoritmo de scoring (obrigatório por `specs/10`).
- Qualquer desvio de uma spec existente.

## Regras

- ADR publicado não se edita — decisão revista vira ADR novo com `substituída por NNN` no antigo.
- Sem decisão do usuário quando houver alternativas reais em aberto: apresentar as opções com recomendação e esperar a escolha antes de gravar o status como "aceita".
