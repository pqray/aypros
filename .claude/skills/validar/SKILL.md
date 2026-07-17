---
name: validar
description: Roda a suíte de qualidade completa do monorepo (lint, typecheck, test, build) e reporta um resumo honesto.
---

# Validar

Roda o ritual de qualidade do projeto na raiz, na ordem, e reporta o resultado real.

## Passos

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

Rodar em sequência (um comando por vez, senão a saída embola). Para cada um, capturar o resumo de tasks do Turbo (`Tasks: N successful, N total`) e qualquer falha.

## Em caso de falha

- Investigar a causa raiz antes de qualquer correção — mostrar o erro real (não só "falhou").
- Falha de teste: rodar só o package afetado (`pnpm --filter <pkg> test`) para isolar.
- Nunca "resolver" desabilitando teste, regra de lint ou checagem de tipo. Se a regra estiver errada, é decisão para o usuário.
- Corrigir e rodar a suíte completa de novo — o resultado reportado é sempre o da última rodada completa.

## Report

Uma linha por comando com o resultado, e detalhe apenas do que falhou/mudou. Nunca reportar sucesso parcial como sucesso: se algo ficou vermelho, o resumo diz isso primeiro.
