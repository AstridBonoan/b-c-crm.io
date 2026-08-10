-- Soft founder roles for B&C (2-person team).
-- Equal access for both; roles are ownership labels (delivery vs growth).

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'user_role'
      and e.enumlabel = 'admin'
  ) then
    create type public.user_role_v2 as enum ('founder_cto', 'founder_cmo');

    alter table public.profiles alter column role drop default;

    alter table public.profiles
      alter column role type public.user_role_v2
      using (
        case
          when role::text in ('developer', 'admin', 'manager') then 'founder_cto'::public.user_role_v2
          else 'founder_cmo'::public.user_role_v2
        end
      );

    drop type public.user_role;
    alter type public.user_role_v2 rename to user_role;

    alter table public.profiles
      alter column role set default 'founder_cto'::public.user_role;
  end if;
end $$;

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
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'founder_cto'::public.user_role
  );
  return new;
end;
$$;

drop policy if exists "Employees can update own profile" on public.profiles;
drop policy if exists "Employees can update own profile basics" on public.profiles;

create policy "Employees can update profiles"
on public.profiles for update
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());
