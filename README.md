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
2. Put the project URL and **anon** key in `.env`:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

3. Run the SQL in `supabase/migrations/20260324120000_initial_schema.sql` in the Supabase SQL editor.
4. Create employee users in **Authentication → Users** (or invite). Profiles are created automatically via trigger.
5. Optionally set `role` on `profiles` (`admin`, `manager`, `sales`, `developer`).

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
- `VITE_SUPABASE_ANON_KEY`

`GITHUB_TOKEN` is provided automatically for deploying to `gh-pages`.

---

## Branch strategy

`main` is always the stable, deployable branch.

Develop one major feature per branch:

```text
feature/authentication
feature/dashboard
feature/companies
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
Lead → Sales Opportunity / Deal → Customer → Project → Completed Project
```

Entities stay related through foreign keys; the CRM does not collapse everything into a single generic “client” record.

---

## Project structure

```text
src/
├── components/     # Shared UI
├── layouts/        # App shell (sidebar + header)
├── lib/            # Supabase client, env helpers
├── features/       # Feature modules (auth, dashboard, …)
├── pages/          # Thin route placeholders for upcoming modules
├── types/          # Shared TypeScript / DB types
├── App.tsx
└── main.tsx
supabase/
└── migrations/     # PostgreSQL schema + RLS
.github/workflows/  # CI + gh-pages deploy
```

---

## Current status (foundation)

Implemented:

- React + TypeScript + Tailwind
- Supabase client + env configuration
- Auth foundation (login, session, protected routes, sign out)
- App layout with sidebar/header
- Routing with module placeholders
- Initial normalized schema + RLS + private storage bucket
- GitHub Actions build/validate + deploy to `gh-pages`
- README and `.env.example`

Next: implement modules one at a time on their feature branches, starting with whichever you prioritize (typically companies → contacts → leads).

---

## Security notes

- Only authenticated, **active** employees pass RLS (`profiles.is_active`).
- Role-based write restrictions can be tightened on `feature/user-roles`.
- Never put the Supabase **service role** key in frontend code or GitHub Pages secrets meant for `VITE_*` public env vars.
- Documents bucket `crm-documents` is private; access is gated by storage policies.
