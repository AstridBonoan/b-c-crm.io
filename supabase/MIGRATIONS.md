# Supabase migrations

Apply these in the Supabase SQL editor **in order** (or with the Supabase CLI).

| File | Purpose |
| --- | --- |
| `20260324120000_initial_schema.sql` | Core tables, RLS, storage bucket |
| `20260810180000_rename_companies_to_clients.sql` | Companies → clients rename |
| `20260810190000_founder_roles.sql` | Founder CTO / CMO roles |
| `20260810191000_signup_role_metadata.sql` | Role from auth metadata |
| `20260810200000_simplify_lead_to_client.sql` | Client status; lead → client workflow |
| `20260813160000_employee_allowlist.sql` | Email allowlist; lock active access |

After `employee_allowlist`:

1. `select * from public.employee_allowlist;` — confirm you and Charlie are listed.
2. Supabase Auth → Email → disable **Enable sign ups**.
