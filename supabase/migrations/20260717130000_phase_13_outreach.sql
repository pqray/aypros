-- Phase 13: contact logging for outreach routine.

alter type public.activity_type add value if not exists 'lead_contacted';

alter table public.leads
  add column if not exists last_contact_at timestamptz;

create index if not exists leads_org_last_contact_idx
  on public.leads (organization_id, last_contact_at desc nulls last);

create index if not exists leads_org_next_action_idx
  on public.leads (organization_id, next_action_at asc)
  where status = 'active';
