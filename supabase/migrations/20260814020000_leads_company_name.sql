-- Leads can represent a company before they become a client.

alter table public.leads
  add column if not exists company_name text;
