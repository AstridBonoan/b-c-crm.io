-- Remove unused Lead Finder category columns.

alter table public.prospect_searches
  drop column if exists category;

alter table public.prospects
  drop column if exists category;
