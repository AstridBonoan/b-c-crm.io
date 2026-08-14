-- Add Interested stage and opportunity fields used by the sales pipeline.

do $$
begin
  if not exists (
    select 1
    from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'deal_stage'
      and e.enumlabel = 'interested'
  ) then
    alter type public.deal_stage add value 'interested' after 'contacted';
  end if;
end
$$;

alter table public.deals
  add column if not exists source text,
  add column if not exists probability integer,
  add column if not exists next_action text,
  add column if not exists next_follow_up_at date;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'deals_probability_range'
  ) then
    alter table public.deals
      add constraint deals_probability_range
      check (probability is null or (probability >= 0 and probability <= 100));
  end if;
end
$$;

comment on column public.deals.source is 'How this opportunity originated (referral, website, lead finder, etc.).';
comment on column public.deals.probability is 'Win likelihood 0–100. Defaults from stage when not set.';
comment on column public.deals.next_action is 'Next concrete step for this opportunity.';
comment on column public.deals.next_follow_up_at is 'Date the next follow-up is due.';
