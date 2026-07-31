# AGENTS.md

## Dev Commands

```bash
npm run dev          # Turbopack on port 3000
npm run build        # Next.js standalone output (for Docker)
npm run start        # Production server on port 3000
npm run lint         # ESLint (next/core-web-vitals + next/typescript only)
npm run typecheck    # tsc --noEmit
npm test             # vitest run (uses vitest.config.ts; unit + legacy projects)
```

- `vitest.config.ts` registers the `@/*` alias and splits `unit` (most suites) vs `legacy` (ai-mcp / ai) projects. All 7 suites pass (59 tests).
- Tests importing modules that chain to `@/lib/auth` (→ next-auth → `next/server`, unresolvable outside Next runtime) must `vi.mock('@/lib/auth')` etc. — see `src/lib/ai/ai.test.ts` and `src/lib/ai-mcp/crud.test.ts`.
- CI: `.github/workflows/ci.yml` runs lint + typecheck + test + build on push/PR.

## Supabase Client Quirks

Two clients exist in `src/lib/supabase.ts`:
- `supabase` — anon key. Used for public reads but **also in some API routes that write** (`api/seed`, `api/calculations/[id]`, `api/feedback`). These will **fail with RLS** if Supabase RLS restricts writes.
- `supabaseAdmin` — service_role key. Bypasses RLS. Used for auth, admin pages, profile CRUD, user CRUD. The **correct client** for any API mutation.

## Auth

- **ADMIN-only login** (`src/lib/auth.ts:37`): users with `role !== 'ADMIN'` are rejected at the auth level. Non-admin accounts exist in the DB but cannot log in.
- Registration (`POST /api/register`) creates `role: 'ADMIN'` by default.
- `trustHost: true` is set. Session strategy: JWT.

## CRUD Patterns & Ownership

- **Chemical profiles (`label_profiles`):**
  - API routes (`/api/profiles*`) always use `supabaseAdmin`.
  - **Hard-delete only**: `DELETE` permanently removes the row (since Jul 2026, was soft-delete). Audit log action is `DELETE`. `calculations.profileId` FK is `ON DELETE SET NULL`, so history is preserved.
  - `isActive` still exists for approve/hide states (activate button), but delete = permanent.
  - Guest (anonymous) ownership via UUID cookie (`guestOwnerToken`). Guests can only edit/delete their own formulas.
  - All CRUD is logged to `formula_audit_logs` via `recordFormulaAudit()`.
- **Users (`users`):** Admin-only CRUD at `/api/users/[id]` (PUT/DELETE). Cannot delete yourself.
- **Audit logs (formula_audit_logs):** displayed at `/admin/audit` (separate from calculation history at `/admin/logs`).
- **User names are AES-256-CBC encrypted** before storage (`src/lib/encryption.ts`). Set `ENCRYPTION_KEY` in `.env` (32-char string).

## Mix Types

- `mix_type: 1` — "แบบผสมให้ได้" (fixed total target volume)
- `mix_type: 2` — "แบบผสมกับ" (dilute chemical into carrier, carrier volume is the reference)

## Notes

- **Tailwind CSS v4**: uses `@import "tailwindcss"` in CSS, `@tailwindcss/postcss` in PostCSS config. No `tailwind.config.js`.
- **React 18** despite `@types/react: ^19`.
- **API routes & page props use `params: Promise<>` and `searchParams: Promise<>`** (Next.js 16 pattern).
- **Port**: always 3000 (dev, Docker, production). Not 3001.
- **app/actions/` dir**: contains a single server action (`export.ts`), not Next.js `actions` — these are `'use server'` functions.
- **No Prisma** — raw Supabase JS client throughout.
- DB fix scripts exist at root: `fix_database.sql`, `fix_id_constraint.sql`, `supabase_schema_update.sql`.
- **Vercel cron** pings `/api/calculations` Tues/Fri 07:00 to prevent Supabase free-tier hibernation.
