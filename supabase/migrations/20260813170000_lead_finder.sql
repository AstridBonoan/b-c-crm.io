-- Lead Finder: prospecting, audits, lists, and CRM handoff.

create type public.prospect_pipeline_status as enum (
  'new',
  'researching',
  'contacted',
  'responded',
  'meeting',
  'proposal',
  'won',
  'lost'
);

create type public.prospect_finding_severity as enum ('info', 'warning', 'critical');

create table public.prospect_searches (
  id uuid primary key default gen_random_uuid(),
  query_label text not null,
  industry text,
  category text,
  city text,
  state text,
  zip text,
  radius_miles numeric(8, 2),
  requires_website boolean,
  business_size text,
  result_count integer not null default 0,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  search_id uuid references public.prospect_searches (id) on delete set null,
  external_id text,
  business_name text not null,
  industry text,
  category text,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  website text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  google_business_url text,
  facebook_url text,
  instagram_url text,
  linkedin_url text,
  yelp_url text,
  has_website boolean not null default false,
  opportunity_score integer not null default 0 check (opportunity_score between 0 and 100),
  website_score integer not null default 0 check (website_score between 0 and 100),
  mobile_score integer not null default 0 check (mobile_score between 0 and 100),
  seo_score integer not null default 0 check (seo_score between 0 and 100),
  performance_score integer not null default 0 check (performance_score between 0 and 100),
  online_presence_score integer not null default 0 check (online_presence_score between 0 and 100),
  lead_gen_score integer not null default 0 check (lead_gen_score between 0 and 100),
  score_breakdown jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  recommended_services text[] not null default '{}',
  pipeline_status public.prospect_pipeline_status not null default 'new',
  saved_to_crm boolean not null default false,
  crm_lead_id uuid references public.leads (id) on delete set null,
  crm_client_id uuid references public.clients (id) on delete set null,
  notes text,
  last_contacted_at date,
  next_follow_up_at date,
  analyzed_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospect_audits (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  website_url text,
  https boolean,
  http_status integer,
  has_title boolean,
  title text,
  has_meta_description boolean,
  meta_description text,
  has_h1 boolean,
  has_viewport boolean,
  has_contact_form boolean,
  has_phone_on_page boolean,
  has_email_on_page boolean,
  has_cta boolean,
  has_contact_page boolean,
  robots_txt_found boolean,
  sitemap_found boolean,
  images_missing_alt integer,
  page_bytes integer,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.prospect_lists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospect_list_items (
  list_id uuid not null references public.prospect_lists (id) on delete cascade,
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, prospect_id)
);

create table public.prospect_notes (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.prospects (id) on delete cascade,
  body text not null,
  next_follow_up_at date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index prospects_opportunity_score_idx on public.prospects (opportunity_score desc);
create index prospects_website_score_idx on public.prospects (website_score);
create index prospects_pipeline_status_idx on public.prospects (pipeline_status);
create index prospects_industry_idx on public.prospects (industry);
create index prospects_city_state_idx on public.prospects (city, state);
create index prospects_search_id_idx on public.prospects (search_id);

create trigger prospects_set_updated_at
before update on public.prospects
for each row execute function public.set_updated_at();

create trigger prospect_lists_set_updated_at
before update on public.prospect_lists
for each row execute function public.set_updated_at();

alter table public.prospect_searches enable row level security;
alter table public.prospects enable row level security;
alter table public.prospect_audits enable row level security;
alter table public.prospect_lists enable row level security;
alter table public.prospect_list_items enable row level security;
alter table public.prospect_notes enable row level security;

create policy "Employees manage prospect searches"
on public.prospect_searches for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage prospects"
on public.prospects for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage prospect audits"
on public.prospect_audits for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage prospect lists"
on public.prospect_lists for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage prospect list items"
on public.prospect_list_items for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());

create policy "Employees manage prospect notes"
on public.prospect_notes for all
to authenticated
using (public.is_active_employee())
with check (public.is_active_employee());
