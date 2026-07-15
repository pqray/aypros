# 08 — Descoberta de Empresas

Busca de empresas reais por **cidade + segmento** via provider externo desacoplado (`packages/integrations`).

## Provider interface

```
DiscoveryProvider {
  name: string
  search(params: { city; state?; country; segment; page/cursor?; limit }): Promise<DiscoveryResult>
}
```

`DiscoveryResult`: lista de empresas normalizadas + cursor/flag de próxima página + metadados (total estimado, custo de chamadas). Erros tipados: `RATE_LIMITED`, `QUOTA_EXCEEDED`, `INVALID_LOCATION`, `PROVIDER_ERROR`.

- Provider real do MVP: **decisão pendente** (candidatos: Google Places API (New), Foursquare Places, Serper/SerpAPI — registrar ADR ao decidir; a interface não pode vazar detalhes do escolhido).
- **Provider mock existe somente em testes** (implementa a mesma interface com fixtures). Proibido em produção.

## Dados permitidos por empresa

Somente dados factuais públicos do provider: nome, endereço, cidade/UF, telefone, site (URL), avaliação média, quantidade de avaliações, categorias, coordenadas, id do provider. Guardar payload bruto em `businesses.raw` para reprocessamento. Respeitar os termos de uso do provider escolhido (cache/retenção — ver ADR do provider).

## Normalização

- Telefone → E.164 quando possível.
- Website → URL absoluta com esquema; remover UTM; detectar "site" que é só perfil social (Instagram/Facebook/Linktree) e classificar como `social_only` (conta como "sem site próprio" para o score).
- Nome/endereço com trim e espaço normalizado; cidade/estado padronizados.

## Deduplicação

1. Chave primária de dedupe: (`provider`, `provider_place_id`) — UNIQUE no banco (upsert).
2. Dedupe secundário na exibição: mesmo telefone ou mesmo nome normalizado + endereço próximo → marcar como duplicata provável (não fundir automaticamente no MVP).

## Fluxo de pesquisa

1. Usuário submete cidade + segmento (form validado com Zod; params refletidos na URL).
2. Server cria `searches` com `status = pending` e responde imediatamente com o id.
3. Execução processa páginas do provider em lotes dentro do limite serverless, fazendo upsert em `businesses` e inserindo `search_results`; atualiza `status = processing` com progresso (`total_found`).
4. Terminal: `completed` (tudo ok), `partial` (algumas páginas falharam — registrar motivo), `failed` (nada obtido, `error_message` amigável).
5. Cliente acompanha por polling (ver `14-data-fetching-state.md`) e exibe resultados incrementalmente.

## Paginação e limites

- Resultados exibidos com paginação server-side (tabela — ver `11-businesses-and-favorites.md`).
- Limite de resultados por pesquisa (ex.: 60–100, conforme custo do provider) — configurável em `packages/config`.
- Rate limiting por organização (ex.: N pesquisas/hora) — mecanismo em `17-security.md`.

## Cache

- `businesses` funciona como cache global: nova pesquisa reaproveita empresas já conhecidas (upsert atualiza dados).
- Pesquisa idêntica (mesma cidade+segmento+org) recente (ex.: < 24h) oferece reutilizar resultado em vez de nova chamada ao provider (economia de quota).

## Tratamento de erros

- Erros do provider mapeados para mensagens claras na UI (quota, localização inválida, indisponibilidade).
- Falha em página intermediária não invalida o que já foi salvo (`partial`).
- Retentativa manual pelo usuário; sem retry automático agressivo no MVP.
