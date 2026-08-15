-- Sales workspace: meetings and proposals attached to deals.
-- Also records when a deal was won or lost for monthly metrics.

alter table public.deals
  add column if not exists closed_at date;

update public.deals
set closed_at = (updated_at at time zone 'utc')::date
where stage in ('won', 'lost')
  and closed_at is null;

create table if not exists public.deal_meetings (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  meeting_at timestamptz not null,
  meeting_type text not null default 'sales_meeting'
    check (
      meeting_type in (
        'discovery',
        'sales_meeting',
        'consultation',
        'follow_up',
        'presentation',
        'other'
      )
    ),
  location_or_link text,
  notes text,
  outcome text
    check (
      outcome is null
      or outcome in (
        'interested',
        'needs_follow_up',
        'proposal_requested',
        'not_interested',
        'won',
        'lost',
        'other'
      )
    ),
  next_action text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deal_proposals (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  client_id uuid references public.clients (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  service text,
  amount numeric(12, 2),
  description text,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  sent_at date,
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists deal_meetings_deal_id_idx on public.deal_meetings (deal_id);
create index if not exists deal_meetings_meeting_at_idx on public.deal_meetings (meeting_at);
create index if not exists deal_proposals_deal_id_idx on public.deal_proposals (deal_id);
create index if not exists deal_proposals_status_idx on public.deal_proposals (status);
create index if not exists deals_closed_at_idx on public.deals (closed_at);

create trigger deal_meetings_set_updated_at
before update on public.deal_meetings
for each row execute function public.set_updated_at();

create trigger deal_proposals_set_updated_at
before update on public.deal_proposals
for each row execute function public.set_updated_at();

alter table public.deal_meetings enable row level security;
alter table public.deal_proposals enable row level security;

create policy "Employees manage deal meetings"
on public.deal_meetings for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage deal proposals"
on public.deal_proposals for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());
