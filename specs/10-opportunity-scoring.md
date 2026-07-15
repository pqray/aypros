# 10 — Score de Oportunidade

Pacote **puro** `packages/scoring`: recebe dados da empresa + auditoria mais recente, retorna resultado determinístico. Sem I/O. Persistência em `opportunity_scores` (`04-database.md`).

## Saída

```
{ score: 0–100, level, confidence, reasons[], suggestedServices[], algorithmVersion }
```

- `level`: `low` (0–39), `medium` (40–59), `high` (60–79), `very_high` (80–100).
- `confidence`: `high` (auditoria completa), `medium` (dados parciais/inconclusivos), `low` (sem auditoria — score baseado só em dados do provider).
- `reasons[]`: lista ordenada de motivos legíveis com o impacto de cada um (ex.: "Não possui site próprio (+40)").
- `suggestedServices[]`: derivado dos motivos (ex.: sem site → "Criação de site"; sem HTTPS/desatualizado → "Reformulação"; sem viewport → "Site responsivo").

## Regras e pesos (v1 — base 0, somar/subtrair, clamp 0–100)

| Sinal | Pontos |
|---|---|
| Não possui site (nem social) | +40 |
| "Site" é apenas rede social (`social_only`) | +35 |
| Site fora do ar / erro SSL | +30 |
| Site sem HTTPS | +15 |
| Sem meta viewport (não responsivo) | +12 |
| Sinais de site desatualizado | +10 |
| Sem title/description adequados | +8 |
| Plataforma de site gratuito/builder básico detectada | +6 |
| Bônus: empresa ativa (rating ≥ 4.0 e ≥ 20 avaliações) | +15 |
| Bônus: tem telefone/WhatsApp (abordável) | +5 |
| Penalidade: site moderno e saudável (https + viewport + metadados ok) | −30 |
| Penalidade: pouquíssima atividade (0 avaliações) | −10 |
| Sinal `inconclusive` | 0 (não pontua; reduz `confidence`) |

Racional: o melhor lead é uma **empresa ativa com presença digital fraca**. Sinais somente positivos de qualidade do site reduzem o score.

## Versionamento

- `algorithmVersion` (ex.: `v1`) gravado em cada resultado; mudanças de pesos/regras incrementam a versão e geram ADR.
- Recalcular score não apaga histórico (append-only).

## Testes (obrigatórios — ver `16-testing.md`)

Casos de tabela: sem site; social-only; site quebrado; site saudável; empresa inativa; dados parciais → cobrir score, level, confidence, reasons e clamp dos limites.
