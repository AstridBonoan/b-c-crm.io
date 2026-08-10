-- Upgrade path if the earlier "companies" schema was already applied.
-- Safe to skip when using the updated initial migration on a fresh project.

do $$
begin
  if to_regclass('public.companies') is not null
     and to_regclass('public.clients') is null then

    create type public.client_type as enum ('individual', 'organization');

    alter table public.companies rename to clients;
    alter table public.clients
      add column if not exists client_type public.client_type not null default 'organization',
      add column if not exists first_name text,
      add column if not exists last_name text;

    alter table public.contacts rename column company_id to client_id;
    alter table public.leads rename column company_id to client_id;
    alter table public.deals rename column company_id to client_id;
    alter table public.customers rename column company_id to client_id;
    alter table public.projects rename column company_id to client_id;
    alter table public.tasks rename column company_id to client_id;
    alter table public.activities rename column company_id to client_id;
    alter table public.notes rename column company_id to client_id;
    alter table public.documents rename column company_id to client_id;

    alter index if exists contacts_company_id_idx rename to contacts_client_id_idx;
    alter index if exists deals_company_id_idx rename to deals_client_id_idx;

    drop policy if exists "Employees manage companies" on public.clients;
    create policy "Employees manage clients"
    on public.clients for all
    to authenticated
    using (public.is_active_employee())
    with check (public.is_active_employee());

    drop trigger if exists companies_set_updated_at on public.clients;
    create trigger clients_set_updated_at
    before update on public.clients
    for each row execute function public.set_updated_at();

    create index if not exists clients_client_type_idx on public.clients (client_type);
    create index if not exists clients_name_idx on public.clients (name);
  end if;
end $$;
