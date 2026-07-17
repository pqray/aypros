-- Phase 16: lead owner assignment.

alter type public.activity_type add value if not exists 'lead_assigned';

alter table public.leads
  add column if not exists assigned_to uuid null references public.profiles(id) on delete set null;

create index if not exists leads_org_assigned_to_idx
  on public.leads (organization_id, assigned_to);
