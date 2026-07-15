# 04 — Banco de Dados

Supabase PostgreSQL + Drizzle ORM (`packages/database`). Migrations SQL versionadas em `/supabase/migrations`. Nomes de tabelas/colunas em inglês, `snake_case`.

## Entidades e relacionamentos

```
auth.users (Supabase)
  └─ profiles (1:1)
organizations ─< organization_members >─ profiles
organizations ─< searches ─< search_results >─ businesses
organizations ─< favorites >─ businesses
organizations ─< saved_filters
businesses ─< website_audits (histórico)
businesses ─1 opportunity_scores (score atual) + score em cada audit
organizations ─< leads >─ businesses
leads ─< notes
leads/org ─< activities
organizations ─< ai_generations
```

## Tabelas

| Tabela | Campos principais |
|---|---|
| `profiles` | `id (uuid, = auth.users.id)`, `full_name`, `avatar_url`, `onboarding_completed_at`, `created_at`, `updated_at` |
| `organizations` | `id`, `name`, `slug (unique)`, `created_by`, timestamps |
| `organization_members` | `organization_id`, `user_id`, `role (enum)`, `created_at`; PK composta (`organization_id`,`user_id`) |
| `searches` | `id`, `organization_id`, `created_by`, `city`, `state`, `country`, `segment`, `status (process_status)`, `total_found`, `error_message`, `provider`, timestamps; índice (`organization_id`, `created_at desc`) |
| `businesses` | `id`, `provider`, `provider_place_id`, `name`, `address`, `city`, `state`, `phone`, `website_url`, `rating (numeric)`, `review_count (int)`, `categories (text[])`, `lat`, `lng`, `raw jsonb`, timestamps; UNIQUE (`provider`,`provider_place_id`) |
| `search_results` | `search_id`, `business_id`, `position`; PK composta |
| `favorites` | `organization_id`, `business_id`, `created_by`, `created_at`; PK composta (`organization_id`,`business_id`) |
| `saved_filters` | `id`, `organization_id`, `created_by`, `name`, `filters jsonb`, timestamps |
| `website_audits` | `id`, `business_id`, `organization_id`, `requested_by`, `status (process_status)`, `final_url`, `http_status`, `response_time_ms`, `redirect_count`, `is_https`, `detections jsonb`, `evidence jsonb`, `error_code`, `created_at`, `completed_at`; índice (`business_id`, `created_at desc`) |
| `opportunity_scores` | `id`, `business_id`, `audit_id (nullable)`, `score (0–100)`, `level (enum)`, `confidence (enum)`, `reasons jsonb`, `suggested_services jsonb`, `algorithm_version`, `created_at`; índice (`business_id`, `created_at desc`) |
| `leads` | `id`, `organization_id`, `business_id`, `stage (enum)`, `status (enum)`, `potential_value (numeric, nullable)`, `next_action`, `next_action_at`, `position (para ordenação no Kanban)`, `created_by`, timestamps; UNIQUE (`organization_id`,`business_id`) |
| `notes` | `id`, `lead_id`, `organization_id`, `author_id`, `content`, timestamps |
| `activities` | `id`, `organization_id`, `lead_id (nullable)`, `business_id (nullable)`, `actor_id`, `type (enum)`, `payload jsonb`, `created_at`; índice (`organization_id`, `created_at desc`) |
| `ai_generations` | `id`, `organization_id`, `business_id`, `requested_by`, `kind (enum)`, `prompt_version`, `input jsonb`, `output jsonb`, `model`, `tokens_used`, `status`, `created_at` |

`businesses` é global (cache compartilhado entre organizações — não contém dado sensível de org); tudo o mais é escopado por `organization_id`.

## Enums

- `process_status`: `pending | processing | completed | partial | failed`
- `member_role`: `owner | admin | member`
- `opportunity_level`: `low | medium | high | very_high`
- `confidence_level`: `low | medium | high`
- `lead_stage`: `new | contacted | in_conversation | proposal_sent | won | lost`
- `lead_status`: `active | won | lost | archived`
- `activity_type`: `search_created | business_favorited | audit_completed | lead_created | lead_stage_changed | note_created | ai_generated | export_created | ...`
- `ai_kind`: `commercial_summary | whatsapp_message | email_message`

## Constraints e integridade

- FKs com `on delete cascade` para dados dependentes (notes → leads) e `restrict`/`set null` onde histórico deve sobreviver.
- `score` com CHECK `0 <= score <= 100`.
- Deduplicação de empresas por (`provider`,`provider_place_id`); normalização adicional em `08-business-discovery.md`.

## RLS (detalhes de política em `17-security.md`)

- Todas as tabelas com `organization_id`: acesso somente a membros da organização (via `organization_members`).
- `profiles`: usuário lê/edita apenas o próprio.
- `businesses`, `website_audits` (dados técnicos) e `opportunity_scores`: leitura para autenticados; escrita apenas server-side.
- Mutações passam por Server Actions/Route Handlers que verificam membership antes de tocar o banco.

## Auditoria e histórico

- `website_audits` e `opportunity_scores` são **append-only**: cada análise gera nova linha; a mais recente é a corrente.
- `activities` registra eventos relevantes por organização (alimenta dashboard e timeline do lead).
