# Product readiness checklist

Use branch **`chore/product-readiness`** for this work. Keep **`feature/simplify-lead-to-client`** (PR #27) unchanged until you intentionally merge fixes.

## Before calling it ready

### Supabase
- [ ] Apply every file in `supabase/migrations/` in order (`MIGRATIONS.md`)
- [ ] Run `select email, is_active, role from profiles;` — you and Charlie are active
- [ ] Run `select * from employee_allowlist;` — both emails listed
- [ ] Auth → Providers → Email → **Disable sign ups**
- [ ] Confirm a random non-allowlisted email cannot use the CRM

### App smoke path
- [ ] Sign in as CTO and as CMO
- [ ] Create lead → **Convert** → client is Active
- [ ] Add contact under that client
- [ ] Create deal / move pipeline stage
- [ ] Create project on the client
- [ ] Log activity, note, task; upload a document
- [ ] Dashboard, Search, Analytics, Team (allowlist panel) load without errors
- [ ] Tall Edit lead modal is centered and fully usable

### Deploy
- [ ] Merge PR #27 (or readiness PR) into `main`
- [ ] Confirm GitHub Actions deploy to `gh-pages`
- [ ] Spot-check https://astridbonoan.github.io/b-c-crm.io/

## Branch rules
| Branch | Purpose |
| --- | --- |
| `feature/simplify-lead-to-client` | Stable PR candidate — don’t experiment here |
| `chore/product-readiness` | Testing + polish |
| `main` | Production source after merge |
