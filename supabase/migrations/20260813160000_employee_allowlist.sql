-- Lock CRM access to an email allowlist.
-- Existing active profiles (you + Charlie) are seeded automatically.
-- New Auth users who are not allowlisted get is_active = false and cannot pass RLS.

create table if not exists public.employee_allowlist (
  email text primary key,
  note text,
  created_at timestamptz not null default now(),
  constraint employee_allowlist_email_lowercase check (email = lower(email))
);

comment on table public.employee_allowlist is
  'Only these emails may hold active CRM access. Manage in Supabase SQL — not from the app.';

alter table public.employee_allowlist enable row level security;

drop policy if exists "Active employees can read allowlist" on public.employee_allowlist;
create policy "Active employees can read allowlist"
on public.employee_allowlist for select
to authenticated
using (public.is_active_employee());

-- Seed from people already active (Astrid + Charlie, etc.).
insert into public.employee_allowlist (email, note)
select lower(p.email), 'Seeded from active profile'
from public.profiles p
where p.is_active = true
  and p.email is not null
  and length(trim(p.email)) > 0
on conflict (email) do nothing;

create or replace function public.is_allowlisted_email(addr text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employee_allowlist a
    where a.email = lower(trim(addr))
  );
$$;

revoke all on function public.is_allowlisted_email(text) from public;
grant execute on function public.is_allowlisted_email(text) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role text;
  next_role public.user_role;
  allowlisted boolean;
begin
  selected_role := coalesce(new.raw_user_meta_data->>'role', 'founder_cto');

  if selected_role = 'founder_cmo' then
    next_role := 'founder_cmo'::public.user_role;
  else
    next_role := 'founder_cto'::public.user_role;
  end if;

  allowlisted := public.is_allowlisted_email(coalesce(new.email, ''));

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    next_role,
    allowlisted
  );
  return new;
end;
$$;

create or replace function public.enforce_profile_access_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
     and lower(coalesce(new.email, '')) is distinct from lower(coalesce(old.email, '')) then
    raise exception 'Profile email cannot be changed from the CRM';
  end if;

  if new.is_active
     and not public.is_allowlisted_email(coalesce(new.email, '')) then
    raise exception 'Only allowlisted employee emails can be active in the CRM';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_enforce_access on public.profiles;
create trigger profiles_enforce_access
before insert or update on public.profiles
for each row execute function public.enforce_profile_access_rules();

-- Let a signed-in user read their own row (so inactive users see Access denied).
drop policy if exists "Employees can read profiles" on public.profiles;
create policy "Employees can read profiles"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_active_employee());

-- Keep team edits, but activation is still blocked by the allowlist trigger.
drop policy if exists "Employees can update profiles" on public.profiles;
create policy "Employees can update profiles"
on public.profiles for update
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());
