create or replace function public.get_app_context()
returns table (
  user_id uuid,
  email text,
  full_name text,
  onboarding_completed_at timestamptz,
  organization_id uuid,
  organization_name text,
  organization_slug text,
  organization_role public.member_role
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    profiles.id as user_id,
    auth.jwt() ->> 'email' as email,
    profiles.full_name,
    profiles.onboarding_completed_at,
    organizations.id as organization_id,
    organizations.name as organization_name,
    organizations.slug as organization_slug,
    active_membership.role as organization_role
  from public.profiles
  left join lateral (
    select organization_members.organization_id, organization_members.role
    from public.organization_members
    where organization_members.user_id = profiles.id
    order by organization_members.created_at asc
    limit 1
  ) active_membership on true
  left join public.organizations on organizations.id = active_membership.organization_id
  where profiles.id = auth.uid();
$$;
