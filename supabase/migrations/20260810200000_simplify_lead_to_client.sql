-- Simplify CRM: leads convert into clients; client_status replaces separate Customers module.

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'client_status'
  ) then
    create type public.client_status as enum ('prospect', 'active', 'inactive');
  end if;
end $$;

alter table public.clients
  add column if not exists client_status public.client_status not null default 'prospect';

-- Existing paying accounts (customers table) become active/inactive clients.
update public.clients c
set client_status = case
  when cu.status = 'inactive' then 'inactive'::public.client_status
  else 'active'::public.client_status
end
from public.customers cu
where cu.client_id = c.id;

-- Projects no longer require a customers row.
alter table public.projects
  alter column customer_id drop not null;

comment on column public.clients.client_status is
  'prospect = early relationship; active = working/paying client; inactive = past client';
