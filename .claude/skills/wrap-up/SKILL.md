---
name: wrap-up
description: Fechamento de fase — confere critérios de aceite, specs atualizadas, suíte verde e commita no padrão do projeto.
---

# Wrap-up de fase

Ritual de fim de fase. Só rodar quando a implementação da fase estiver completa.

## Passos

1. **Critérios de aceite**: abrir o `specs/phases/phase-NN-*.md` da fase e conferir item por item. O que não estiver atendido: reportar como pendência, não maquiar.
2. **Specs sincronizadas**:
   - Endpoints novos documentados na tabela de `specs/19-backend-api.md`.
   - Divergências de spec viraram ADR (usar a skill `adr`).
   - Decisões da fase resolvidas em `specs/decisions/README.md`.
3. **Suíte completa**: usar a skill `validar` (lint + typecheck + test + build). Só prosseguir com tudo verde.
4. **Commit**:
   - Conferir `git status` — nada de arquivo estranho, temporário ou secret indo junto (checar `.env*`, logs, artefatos de build).
   - Mensagem no padrão do histórico: título `Phase NN: <resumo — em pt-BR>` + corpo explicando o quê e o porquê (não lista de arquivos).
   - Mensagens multi-linha via arquivo (`git commit -F <arquivo>`) para não quebrar aspas no PowerShell.
   - Terminar com `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
5. **Report final**: o que a fase entregou, o que ficou de fora (e onde está anotado), estado do git (commits à frente do remoto). **Nunca dar push sem o usuário pedir.**
6. Lembrar o usuário do que é manual (ex.: roteiro E2E, validação de qualidade de IA) e **aguardar aprovação explícita antes de iniciar a próxima fase**.
