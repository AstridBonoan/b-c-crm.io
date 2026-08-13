# Lead Finder

Internal prospecting for B&C founders (CTO and CMO — full shared access).

Roles are soft labels only: growth work often sits with the CMO, but both founders can search, save, and follow up.

## Phase 1 (this branch)

- Prospect search (industry, city, state, ZIP, radius, website filter)
- Discovery via OpenStreetMap Overpass (errors/empty results surface as warnings — no demo data)
- Prospect list filters/sort + CSV export
- Prospect detail (contact info, notes)
- **Save lead to CRM** (creates client + lead)

## Apply in Supabase

1. Run `supabase/migrations/20260813170000_lead_finder.sql`
2. If you already applied an earlier Lead Finder migration that included scoring columns, also run `supabase/migrations/20260813180000_remove_prospect_scoring.sql`

## Workflow

Search → Discover → Filter → Review → Save to CRM → Contact in Leads

## Later phases

- Richer directory/social presence APIs
- Lists UI (tables exist)
- Excel/PDF export
- Dashboard widgets for follow-ups
