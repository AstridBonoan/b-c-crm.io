-- B&C Internal CRM — initial schema
-- Apply in Supabase SQL editor or via Supabase CLI migrations.
-- Never expose the service role key in the frontend.

create extension if not exists "pgcrypto";

create type public.user_role as enum ('founder_cto', 'founder_cmo');
create type public.client_type as enum ('individual', 'organization');
create type public.client_status as enum ('prospect', 'active', 'inactive');
create type public.lead_status as enum (
  'new',
  'contacted',
  'following_up',
  'converted',
  'lost'
);
create type public.deal_stage as enum (
  'new_lead',
  'contacted',
  'interested',
  'meeting',
  'proposal_sent',
  'negotiating',
  'won',
  'lost'
);
create type public.project_status as enum (
  'not_started',
  'planning',
  'in_development',
  'review',
  'completed'
);
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum (
  'todo',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'founder_cto',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  client_type public.client_type not null default 'organization',
  client_status public.client_status not null default 'prospect',
  name text not null,
  first_name text,
  last_name text,
  industry text,
  website text,
  email text,
  phone text,
  address text,
  location text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  job_title text,
  email text,
  phone text,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  company_name text,
  source text,
  service_interested text,
  status public.lead_status not null default 'new',
  estimated_value numeric(12, 2),
  notes text,
  assigned_to uuid references public.profiles (id) on delete set null,
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  service text,
  source text,
  estimated_value numeric(12, 2),
  proposal_amount numeric(12, 2),
  stage public.deal_stage not null default 'new_lead',
  probability integer check (probability is null or (probability >= 0 and probability <= 100)),
  expected_close_date date,
  next_action text,
  next_follow_up_at date,
  assigned_to uuid references public.profiles (id) on delete set null,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete restrict,
  converted_from_deal_id uuid references public.deals (id) on delete set null,
  converted_from_lead_id uuid references public.leads (id) on delete set null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  total_revenue numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer_id uuid references public.customers (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  deal_id uuid references public.deals (id) on delete set null,
  project_type text,
  description text,
  start_date date,
  due_date date,
  completion_date date,
  project_value numeric(12, 2),
  assigned_to uuid references public.profiles (id) on delete set null,
  status public.project_status not null default 'not_started',
  progress integer not null default 0 check (progress between 0 and 100),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid references public.profiles (id) on delete set null,
  due_date date,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'todo',
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  summary text not null,
  details text,
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  client_id uuid references public.clients (id) on delete cascade,
  contact_id uuid references public.contacts (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_has_parent check (
    num_nonnulls(
      client_id,
      contact_id,
      lead_id,
      deal_id,
      customer_id,
      project_id
    ) >= 1
  )
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_client_type_idx on public.clients (client_type);
create index clients_name_idx on public.clients (name);
create index contacts_client_id_idx on public.contacts (client_id);
create index leads_status_idx on public.leads (status);
create index leads_assigned_to_idx on public.leads (assigned_to);
create index deals_stage_idx on public.deals (stage);
create index deals_client_id_idx on public.deals (client_id);
create index projects_customer_id_idx on public.projects (customer_id);
create index projects_status_idx on public.projects (status);
create index tasks_assigned_to_idx on public.tasks (assigned_to);
create index tasks_status_idx on public.tasks (status);
create index activities_occurred_at_idx on public.activities (occurred_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger contacts_set_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create trigger deals_set_updated_at
before update on public.deals
for each row execute function public.set_updated_at();

create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create trigger documents_set_updated_at
before update on public.documents
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when coalesce(new.raw_user_meta_data ->> 'role', '') = 'founder_cmo'
        then 'founder_cmo'::public.user_role
      else 'founder_cto'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_active_employee()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.deals enable row level security;
alter table public.customers enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.activities enable row level security;
alter table public.notes enable row level security;
alter table public.documents enable row level security;

-- Soft founder roles: equal access; titles mark primary lanes only.

create policy "Employees can read profiles"
on public.profiles for select
to authenticated
using (public.is_active_employee());

create policy "Employees can update profiles"
on public.profiles for update
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage clients"
on public.clients for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage contacts"
on public.contacts for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage leads"
on public.leads for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage deals"
on public.deals for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage customers"
on public.customers for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage projects"
on public.projects for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage tasks"
on public.tasks for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage activities"
on public.activities for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage notes"
on public.notes for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage documents"
on public.documents for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

insert into storage.buckets (id, name, public)
values ('crm-documents', 'crm-documents', false)
on conflict (id) do nothing;

create policy "Employees read crm documents"
on storage.objects for select
to authenticated
using (bucket_id = 'crm-documents' and public.is_active_employee());

create policy "Employees upload crm documents"
on storage.objects for insert
to authenticated
with check (bucket_id = 'crm-documents' and public.is_active_employee());

create policy "Employees update crm documents"
on storage.objects for update
to authenticated
using (bucket_id = 'crm-documents' and public.is_active_employee())
with check (bucket_id = 'crm-documents' and public.is_active_employee());

create policy "Employees delete crm documents"
on storage.objects for delete
to authenticated
using (bucket_id = 'crm-documents' and public.is_active_employee());
