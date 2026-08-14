-- Replace qualified/unqualified with following_up.

alter table public.leads alter column status drop default;

alter table public.leads
  alter column status type text using status::text;

update public.leads
set status = 'following_up'
where status in ('qualified', 'unqualified');

drop type public.lead_status;

create type public.lead_status as enum (
  'new',
  'contacted',
  'following_up',
  'converted',
  'lost'
);

alter table public.leads
  alter column status type public.lead_status using status::public.lead_status;

alter table public.leads
  alter column status set default 'new'::public.lead_status;
