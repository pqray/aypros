alter table public.leads
  alter column hosting_cost_monthly set default 35;

update public.leads
set
  hosting_cost_monthly = 35,
  estimated_monthly_cost = (domain_cost_annual / 12) + 35,
  suggested_maintenance_value = case
    when margin_target_percent is null then null
    else ((domain_cost_annual / 12) + 35) / (1 - margin_target_percent / 100)
  end,
  updated_at = now()
where hosting_cost_monthly = 0;
