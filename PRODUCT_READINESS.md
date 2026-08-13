# Product readiness checklist

**Where you are:** `chore/product-ready-polish` → open PR [#29](https://github.com/AstridBonoan/b-c-crm.io/pull/29)  
**Already on `main`:** [#27](https://github.com/AstridBonoan/b-c-crm.io/pull/27) (CRM + allowlist) · [#28](https://github.com/AstridBonoan/b-c-crm.io/pull/28) (first readiness pass)

Check a box only when **you** finish that step.

---

## Still needs to be done

Everything below is **waiting on you**. Code for this polish pass is already in PR #29.

### 1. Supabase (do this first)
- [ ] Apply missing SQL in order — see `supabase/MIGRATIONS.md`  
  **Must-have if not done:** `20260813160000_employee_allowlist.sql`
- [ ] Confirm you and Charlie:

```sql
select email, is_active, role from public.profiles order by created_at;
select * from public.employee_allowlist;
```

- [ ] If either founder is missing from the allowlist, add lowercase emails + set `is_active = true`
- [ ] Supabase → **Authentication → Providers → Email** → turn **off** “Enable sign ups”
- [ ] Optional check: a random non-allowlisted email cannot use the CRM

### 2. Smoke-test the app
Run locally on this branch (`npm run dev`) or on Pages after merge.

- [ ] Sign in as **you (CTO)** and as **Charlie (CMO)**
- [ ] Create lead → **Convert** (type a real client name) → Active clients; contact created when details filled
- [ ] Contact, deal/pipeline, project, task, activity, note, document all work
- [ ] Create a project → it shows under your assignment / Team partner visibility
- [ ] Dashboard, Search, Analytics, Team (allowlist emails) load
- [ ] Filters/search with no hits → “No matching…” + Clear filters
- [ ] Tall Edit lead modal is centered (not clipped)
- [ ] Unauthorized / inactive login shows a clear message

### 3. Ship PR #29
- [ ] Merge [#29](https://github.com/AstridBonoan/b-c-crm.io/pull/29) into `main` (after smoke tests)
- [ ] Confirm GitHub Actions deployed to `gh-pages`
- [ ] Spot-check https://astridbonoan.github.io/b-c-crm.io/

---

## Already done (no action)

| Item | Notes |
| --- | --- |
| Full CRM modules + lead → client convert | On `main` via #27 |
| Sign-in only + employee allowlist code | On `main` — **still need** migration + disable signups |
| Modal centering / portal | On `main` |
| Customer pickers removed | On `main` |
| Convert creates contact + navigates to clients | On `main` via #28 |
| Filtered empty states (leads/clients + other lists) | In #29 (lists) / already on main for leads/clients |
| Projects `assigned_to` on create | In #29 |
| Convert form doesn’t prefill org name from service | In #29 |
| Team empty copy = invite / allowlist | In #29 |
| Lint + typecheck | Passing on this branch |

---

## Suggested order

1. Allowlist migration + disable Email sign-ups  
2. Confirm profiles / allowlist for you + Charlie  
3. Smoke-test  
4. Merge PR #29  
5. Check live site  

When every box in **Still needs to be done** is checked, treat the CRM as ready for daily founder use.
