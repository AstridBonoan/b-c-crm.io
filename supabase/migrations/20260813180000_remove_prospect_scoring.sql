-- Remove Lead Finder scoring / website audit surfaces (if an earlier revision created them).

drop policy if exists "Employees manage prospect audits" on public.prospect_audits;
drop table if exists public.prospect_audits;

drop index if exists public.prospects_opportunity_score_idx;
drop index if exists public.prospects_website_score_idx;

alter table public.prospects
  drop column if exists opportunity_score,
  drop column if exists website_score,
  drop column if exists mobile_score,
  drop column if exists seo_score,
  drop column if exists performance_score,
  drop column if exists online_presence_score,
  drop column if exists lead_gen_score,
  drop column if exists score_breakdown,
  drop column if exists findings,
  drop column if exists recommended_services,
  drop column if exists analyzed_at;
