-- Read founder role from signup metadata (defaults to founder_cto only if omitted).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role text;
  next_role public.user_role;
begin
  selected_role := coalesce(new.raw_user_meta_data->>'role', 'founder_cto');

  if selected_role = 'founder_cmo' then
    next_role := 'founder_cmo'::public.user_role;
  else
    next_role := 'founder_cto'::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    next_role
  );
  return new;
end;
$$;
