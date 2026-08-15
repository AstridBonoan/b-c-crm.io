-- Internal finance: invoices, line items, payments, and payment-method settings.
-- No payment-provider integrations.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique,
  client_id uuid not null references public.clients (id) on delete restrict,
  contact_id uuid references public.contacts (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  invoice_date date not null default (now() at time zone 'utc')::date,
  due_date date,
  lifecycle text not null default 'draft'
    check (lifecycle in ('draft', 'issued', 'cancelled')),
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  description text not null,
  quantity numeric(12, 2) not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0,
  line_total numeric(12, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  client_id uuid not null references public.clients (id) on delete restrict,
  project_id uuid references public.projects (id) on delete set null,
  amount numeric(12, 2) not null check (amount > 0),
  method text not null,
  paid_at date not null default (now() at time zone 'utc')::date,
  reference text,
  notes text,
  status text not null default 'completed'
    check (status in ('completed', 'void')),
  provider text,
  provider_transaction_id text,
  external_payment_id text,
  provider_status text,
  provider_metadata jsonb,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.finance_payment_methods (
  id uuid primary key default gen_random_uuid(),
  method_key text not null unique,
  display_name text not null,
  enabled boolean not null default false,
  instructions text,
  payment_url text,
  username text,
  email_or_phone text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_client_id_idx on public.invoices (client_id);
create index if not exists invoices_project_id_idx on public.invoices (project_id);
create index if not exists invoices_lifecycle_idx on public.invoices (lifecycle);
create index if not exists invoices_due_date_idx on public.invoices (due_date);
create index if not exists invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index if not exists payments_invoice_id_idx on public.payments (invoice_id);
create index if not exists payments_client_id_idx on public.payments (client_id);
create index if not exists payments_paid_at_idx on public.payments (paid_at desc);

create trigger invoices_set_updated_at
before update on public.invoices
for each row execute function public.set_updated_at();

create trigger finance_payment_methods_set_updated_at
before update on public.finance_payment_methods
for each row execute function public.set_updated_at();

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.finance_payment_methods enable row level security;

create policy "Employees manage invoices"
on public.invoices for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage invoice items"
on public.invoice_items for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage payments"
on public.payments for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage finance payment methods"
on public.finance_payment_methods for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

insert into public.finance_payment_methods (method_key, display_name, enabled, sort_order, instructions)
values
  ('paypal', 'PayPal', false, 10, null),
  ('venmo', 'Venmo', false, 20, null),
  ('cash_app', 'Cash App', false, 30, null),
  ('zelle', 'Zelle', false, 40, null),
  ('bank_transfer', 'Bank Transfer', false, 50, null),
  ('check', 'Check', false, 60, null),
  ('cash', 'Cash', false, 70, null),
  ('other', 'Other', false, 80, null)
on conflict (method_key) do nothing;
