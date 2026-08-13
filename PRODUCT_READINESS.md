# Product readiness checklist

**You are here:** branch `chore/product-readiness` (polish + hardening).  
**Already merged:** [PR #27](https://github.com/AstridBonoan/b-c-crm.io/pull/27) (`feature/simplify-lead-to-client` → `main`) — core CRM + allowlist security code.

Use this file as your punch list. Check boxes only when **you** verify them.

---

## Still needs to be done (your action)

These are **not** finished until you do them in Supabase / the browser / GitHub.

### 1. Supabase (required for secure access)
- [ ] Apply any missing migrations in order — see `supabase/MIGRATIONS.md`  
  Especially: `20260813160000_employee_allowlist.sql` if you haven’t run it yet
- [ ] Confirm founders:

```sql
select email, is_active, role from public.profiles order by created_at;
select * from public.employee_allowlist;
```

- [ ] If you or Charlie are missing from the allowlist, insert lowercase emails:

```sql
insert into public.employee_allowlist (email, note) values
  ('YOUR_EMAIL@example.com', 'Founder & CTO'),
  ('CHARLIE_EMAIL@example.com', 'Co-Founder & CMO')
on conflict (email) do nothing;

update public.profiles
set is_active = true
where lower(email) in ('your_email@example.com', 'charlie_email@example.com');
```

- [ ] Supabase → **Authentication → Providers → Email** → turn **off** “Enable sign ups”
- [ ] Quick security check: a non-allowlisted email cannot use the CRM

### 2. Smoke-test the live / local app
Do this after migrations. Prefer testing on `chore/product-readiness` locally (`npm run dev`) so you pick up the latest polish.

- [ ] Sign in as **you (CTO)** and as **Charlie (CMO)**
- [ ] Create a lead → **Convert** → lands on Active clients; contact appears when name/email/phone was filled
- [ ] Add or edit a contact under that client
- [ ] Create a deal and move it on Pipeline
- [ ] Create a project on the client
- [ ] Log an activity, add a note, create a task, upload a document
- [ ] Open Dashboard, Search, Analytics, Team (allowlist emails visible)
- [ ] Confirm filtered empty lists say “No matching…” (not “No … yet”)
- [ ] Open a tall **Edit lead** modal — centered, not clipped
- [ ] Confirm unauthorized/inactive login is blocked with a clear message

### 3. Ship the readiness polish to production
PR #27 is already on `main`. This branch still has **extra** readiness commits that are **not** on `main` yet.

- [ ] Open a PR: `chore/product-readiness` → `main` (or ask the agent to)
- [ ] Merge it after smoke tests pass
- [ ] Confirm GitHub Actions deployed to `gh-pages`
- [ ] Spot-check https://astridbonoan.github.io/b-c-crm.io/

---

## Already done in code (no action unless something regresses)

| Area | Status |
| --- | --- |
| Lead → Convert → Client workflow | Done |
| Clients status (`prospect` / `active` / `inactive`) | Done |
| Sign-in only (no public Create account UI) | Done |
| Employee allowlist + inactive blocked (app + RLS) | Done (needs migration applied) |
| Convert creates contact + assigns lead + navigates to clients | Done (on this branch) |
| Customer module removed from nav/UI pickers | Done |
| Team page shows allowlist (soft-fails if table missing) | Done (on this branch) |
| Modal centering / portal fix | Done |
| Filtered empty states (leads/clients) | Done (on this branch) |
| Auth message for unauthorized sessions | Done (on this branch) |
| Lint + typecheck | Passing on this branch |

---

## Branch rules

| Branch | Purpose | Status |
| --- | --- | --- |
| `main` | Production source | Has PR #27; **missing** later readiness commits until you merge this branch |
| `feature/simplify-lead-to-client` | Original ship PR | Merged via #27 — leave alone |
| `chore/product-readiness` | Testing + polish | **Use this** until readiness PR merges |

---

## Suggested order today

1. Run allowlist migration + disable Email sign-ups  
2. Confirm you + Charlie in `profiles` / `employee_allowlist`  
3. Smoke-test the path above  
4. PR + merge `chore/product-readiness` → `main`  
5. Check the live Pages site
