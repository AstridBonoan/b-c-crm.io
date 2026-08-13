# Lead Finder

Internal prospecting for B&C founders (CTO and CMO — full shared access). Deterministic scoring — **no AI**.

Roles are soft labels only: growth work often sits with the CMO, but both founders can search, score, save, and follow up.

## Phase 1 (this branch)

- Prospect search (industry, city, state, ZIP, radius, website filter)
- Discovery via OpenStreetMap Overpass (+ demo fallback)
- Rule-based Opportunity Score with per-category reasons
- Findings → recommended B&C services
- Prospect list filters/sort + CSV export
- Prospect detail (scores, problems, services, notes, pipeline)
- **Save lead to CRM** (creates client + lead)

## Apply in Supabase

1. Run `supabase/migrations/20260813170000_lead_finder.sql`
2. Optional: deploy Edge Function for full website HTML audits:

```bash
supabase functions deploy analyze-website
```

Without the function, websites still score on presence/HTTPS heuristics; HTML checks are marked incomplete.

## Workflow

Search → Discover → Score → Filter → Review → Save to CRM → Contact in Leads

## Later phases

- Richer directory/social presence APIs
- Lists UI (tables exist)
- Excel/PDF export
- Dashboard widgets for follow-ups
- Full Lighthouse metrics via a worker
