# 006 - HTML parser para auditoria HTTP

## Status

Aceita.

## Contexto

A fase 07 precisa analisar HTML server-side sem browser e sem executar JavaScript. O parser deve ser leve, testavel e suficiente para extrair metadados, links, favicon, Open Graph, lang, viewport e sinais simples de plataforma.

## Decisao

Usar `cheerio` em `packages/integrations` para parsing da auditoria HTTP.

## Consequencias

- Mantem a auditoria sem browser/Playwright no MVP.
- API parecida com seletores CSS reduz complexidade das deteccoes.
- Sites renderizados por JavaScript podem ficar inconclusivos; o parser nao tenta executar JS.
- Se a auditoria futura precisar de DOM real/renderizacao, isso fica para roadmap com browser isolado e novas protecoes.
