# B&C Software & Web — Internal CRM

Internal CRM for **B&C Software & Web** employees. It manages leads, sales opportunities, customers, projects, tasks, and relationship history.

This is **not** a customer-facing portal. Customers do not log in.

Live site (GitHub Pages): https://astridbonoan.github.io/b-c-crm.io/

Repository: https://github.com/AstridBonoan/b-c-crm.io

---

## Technology stack

| Layer | Choice |
| --- | --- |
| UI | React + TypeScript (Vite) |
| Styling | Tailwind CSS |
| Backend | Supabase (PostgreSQL, Auth, RLS, Storage) |
| Forms | React Hook Form + Zod |
| Charts | Recharts (used when analytics module is built) |
| Hosting | GitHub Pages (`gh-pages` branch) |
| CI/CD | GitHub Actions |

Not used: Next.js, Vercel, Firebase, MongoDB, custom Express API.

---

## Architecture decisions

**SPA on GitHub Pages.** The app is a Vite React SPA so it can be built as static assets and served from GitHub Pages without a Node server.

**Deploy from branch (`gh-pages`), build from `main`.** Source of truth stays on `main`. Actions validates and builds on every push/PR to `main`, then publishes the production `dist` to the orphan `gh-pages` branch. Configure Pages as:

1. Repo **Settings → Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `gh-pages` / `/ (root)`

Do not point Pages at feature branches.

**Supabase as the backend.** Auth, database, RLS, and file storage live in Supabase so the frontend does not need a custom API. Only the anon key is used in the browser; the service role key must never be committed or exposed.

**Feature-first folders.** Core modules live under `src/features/*` so each CRM capability can grow on its own feature branch without rewriting the foundation.

---

## Local setup

### 1. Install

```bash
npm install
cp .env.example .env
```

### 2. Configure Supabase

1. Create a Supabase project.
2. Put the project URL and **publishable** key in `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

3. Apply **all** SQL files in `supabase/migrations/` in filename order in the Supabase SQL editor (or via Supabase CLI).
4. Confirm you and Charlie appear in `employee_allowlist` (seeded from active profiles after the allowlist migration):

```sql
select email, is_active, role from public.profiles order by created_at;
select * from public.employee_allowlist;
```

5. If either founder is missing from the allowlist, add them (lowercase email):

```sql
insert into public.employee_allowlist (email, note) values
  ('you@example.com', 'Founder & CTO'),
  ('charlie@example.com', 'Co-Founder & CMO')
on conflict (email) do nothing;

update public.profiles
set is_active = true
where lower(email) in ('you@example.com', 'charlie@example.com');
```

6. In Supabase **Authentication → Providers → Email**, turn **off** “Enable sign ups” so accounts cannot be created outside invite/admin flows.
7. Create additional employees only via **Authentication → Users → Invite** (or Add user), then insert their email into `employee_allowlist` before they can become active.

### 3. Run

```bash
npm run dev
```

Open the URL Vite prints (includes the `/b-c-crm.io/` base path used for GitHub Pages).

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run lint` | Lint |
| `npm run typecheck` | TypeScript project references check |
| `npm run validate` | Lint + typecheck |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |

---

## GitHub Actions & Pages

Workflow: `.github/workflows/deploy.yml`

On push/PR to `main`:

1. Install dependencies (`npm ci`)
2. Lint
3. Typecheck + build
4. Copy `index.html` → `404.html` (SPA fallback)
5. On push to `main` only: publish `dist` to `gh-pages`

### Repository secrets

Add these under **Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`GITHUB_TOKEN` is provided automatically for deploying to `gh-pages`.

---

## Branch strategy

`main` is always the stable, deployable branch.

Develop one major feature per branch:

```text
feature/authentication
feature/dashboard
feature/look-and-feel
feature/clients
feature/contacts
feature/leads
feature/sales-pipeline
feature/deals
feature/customers
feature/projects
feature/tasks
feature/activities
feature/notes
feature/documents
feature/search-filtering
feature/analytics
feature/user-roles
```

Workflow:

```text
main → feature/<name> → develop/test → pull request → main → Pages deploy
```

Do not combine unrelated features in one branch.

---

## Business flow

```text
Lead → Convert → Client (active) → Contact / Deal / Project → Delivery work
```

Entities stay related through foreign keys. Top-level accounts are **clients** (organizations or individuals) with status `prospect | active | inactive`.

---

## Project structure

```text
src/
├── components/     # Shared UI
├── layouts/        # App shell (sidebar + header)
├── lib/            # Supabase client, env helpers
├── features/       # Feature modules (auth, dashboard, clients, …)
├── types/          # Shared TypeScript / DB types
├── App.tsx
└── main.tsx
supabase/
└── migrations/     # PostgreSQL schema + RLS
.github/workflows/  # CI + gh-pages deploy
```

---

## Current status

Implemented for internal founder use:

- Auth (sign-in only), session, active-profile gate, employee email allowlist
- Dashboard, clients (with status), contacts, leads (+ convert to client)
- Pipeline / deals, projects, tasks, activities, notes, documents
- Search, analytics, team profiles (CTO / CMO labels)
- Initial schema + RLS + private storage bucket + allowlist migration
- GitHub Actions build/validate + deploy to `gh-pages`
- B&C brand theme with light/dark toggle

Deploy path: merge the current feature branch into `main` so Pages picks up the latest build.

---

## Security notes

- Public **Create account** UI is removed. Sign-in only.
- Only emails in `public.employee_allowlist` may have `profiles.is_active = true`.
- Existing active founders (you + Charlie) are seeded into the allowlist when the migration runs.
- RLS still requires `profiles.is_active` via `is_active_employee()` for CRM data and storage.
- Inactive or non-allowlisted sign-ins are rejected and signed out.
- Profile emails cannot be changed from the CRM; activation of non-allowlisted emails is blocked in the database.
- Never put the Supabase **service role** key in frontend code or GitHub Pages `VITE_*` secrets.
- Documents bucket `crm-documents` is private; access is gated by storage policies.
- Also disable Email sign-ups in the Supabase Auth dashboard (defense in depth).