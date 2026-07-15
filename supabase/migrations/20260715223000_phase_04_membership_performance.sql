create index if not exists organization_members_user_created_idx
  on public.organization_members (user_id, created_at);
