# Product readiness checklist

**Current polish branch:** `chore/product-ready-polish`  
**Already on `main`:** PR [#27](https://github.com/AstridBonoan/b-c-crm.io/pull/27) (CRM + allowlist) and [#28](https://github.com/AstridBonoan/b-c-crm.io/pull/28) (first readiness pass).

Check a box only when **you** verify it.

---

## Still needs to be done (your action)

### 1. Supabase (required)
- [ ] Apply any missing migrations in order — `supabase/MIGRATIONS.md`  
  Especially `20260813160000_employee_allowlist.sql` if not run yet
- [ ] Confirm founders:

```sql
select email, is_active, role from public.profiles order by created_at;
select * from public.employee_allowlist;
```

- [ ] If missing, insert lowercase emails into `employee_allowlist` and set `is_active = true`
- [ ] Auth → Providers → Email → **Disable sign ups**
- [ ] Confirm a non-allowlisted email cannot use the CRM

### 2. Smoke-test (local or live)
Prefer `npm run dev` on the latest polish branch before merging.

- [ ] Sign in as **you (CTO)** and **Charlie (CMO)**
- [ ] Create lead → **Convert** with a real client name → Active clients; contact created when details filled
- [ ] Add/edit contact, deal (pipeline), project, task, activity, note, document
- [ ] Team → partner projects appear after you create a project (assigned to you)
- [ ] Dashboard, Search, Analytics, Team allowlist panel load
- [ ] Search with no hits shows “No matching…” (not “No … yet”)
- [ ] Tall Edit lead modal centered / not clipped
- [ ] Unauthorized login shows a clear message

### 3. Ship this polish pass
- [ ] Merge PR for `chore/product-ready-polish` → `main` (after smoke tests)
- [ ] Confirm Actions deployed to `gh-pages`
- [ ] Spot-check https://astridbonoan.github.io/b-c-crm.io/

---

## Already done in code

| Area | Status |
| --- | --- |
| Lead → Convert → Client (+ contact, navigate) | Done |
| Sign-in only + employee allowlist | Done (needs migration applied) |
| Customer UI pickers removed | Done |
| Modal portal / centering | Done |
| Filtered empty states (most list pages) | Done |
| Projects set `assigned_to` on create | Done (this polish branch) |
| Convert form no longer prefills org name from service | Done (this polish branch) |
| Team empty copy = invite/allowlist | Done (this polish branch) |
| Lint + typecheck | Keep green before merge |

---

## Branch rules

| Branch | Purpose |
| --- | --- |
| `main` | Production |
| `chore/product-ready-polish` | This polish pass |
| Older feature/chore branches | Leave alone once merged |

---

## Suggested order today

1. Run allowlist migration + disable Email sign-ups  
2. Confirm you + Charlie in profiles / allowlist  
3. Smoke-test  
4. Merge this polish PR → `main`  
5. Check live Pages site
