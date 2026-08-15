-- Structured outreach attempts for Lead Finder prospects.
-- One prospect can have many outreach rows. Does not replace prospect_notes or lead status.

create type public.prospect_outreach_method as enum (
  'email',
  'phone',
  'linkedin',
  'instagram',
  'in_person',
  'other'
);

create type public.prospect_outreach_result as enum (
  'no_response',
  'responded',
  'interested',
  'not_interested',
  'meeting_scheduled',
  'proposal_requested',
  'follow_up_needed',
  'other'
);

create table public.prospect_outreach (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  method public.prospect_outreach_method not null,
  contacted_at date not null default (timezone('utc', now()))::date,
  result public.prospect_outreach_result not null,
  next_follow_up_at date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prospect_outreach_prospect_id_idx on public.prospect_outreach (prospect_id);
create index prospect_outreach_contacted_at_idx on public.prospect_outreach (contacted_at desc);
create index prospect_outreach_next_follow_up_idx on public.prospect_outreach (next_follow_up_at);

create trigger prospect_outreach_set_updated_at
before update on public.prospect_outreach
for each row execute function public.set_updated_at();

alter table public.prospect_outreach enable row level security;

create policy "Employees manage prospect outreach"
on public.prospect_outreach for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

comment on table public.prospect_outreach is
  'Contact attempts for Lead Finder prospects. Lead/prospect status is stored separately.';
