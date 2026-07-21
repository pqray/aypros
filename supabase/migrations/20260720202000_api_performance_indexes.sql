create index if not exists ayhub_clients_org_status_idx
  on ayhub.clients (organization_id, status);

create index if not exists ayhub_sites_org_status_idx
  on ayhub.sites (organization_id, status);

create index if not exists ayhub_site_costs_org_next_renewal_idx
  on ayhub.site_costs (organization_id, next_renewal);

create index if not exists ayhub_payments_client_date_idx
  on ayhub.payments (client_id, date);
