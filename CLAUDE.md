# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VBDC 12.2 Chemical Calculator** — a Next.js 16 web app for the Songkhla Vector-Borne Disease Control Center (DDC 12.2) that helps field officers compute chemical mixing ratios (Deltacide, Submarine, etc.) for dengue-vector fogging/ULV spraying. Deployed to Vercel, backed by Supabase (Postgres), authenticated via NextAuth.

All user-facing strings are Thai (`lang="th"`) — do not translate UI labels to English. Domain vocabulary: สารออกฤทธิ์ = active ingredient (`C`), ตัวทำละลาย = solvent/carrier (`S`), หลังบ้าน = houses, ถัง = tank, หมอกควัน = thermal fogging.

## Dev Commands

```bash
npm run dev          # Dev server on port 3000 (Turbopack — Next 16 default)
npm run build        # Next.js standalone output (used by Dockerfile)
npm run start        # Production server on port 3000
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
npm test             # vitest run
npm run test:watch   # vitest watch

npx vitest run src/lib/calculations.test.ts        # single test file
npx vitest run -t "mix_type 2"                     # single test by name
```

Docker: `docker compose up --build -d` (port 3000, reads `.env`). CI (`.github/workflows/ci.yml`) runs lint → typecheck → test → `npm audit` (non-blocking) → build on push/PR to `main`.

**Port is always 3000** — dev, Docker, and production. Never 3001.

## Architecture: Big Picture

Three concentric rings of features:

1. **Public calculator** (`/`) — anonymous users run calculations, browse chemical presets, and manage their own custom formulas via a `guestOwnerToken` UUID cookie.
2. **User portal** (`/user`) — analytics, public formula catalog manager.
3. **Admin panel** (`/admin/*`) — ADMIN-only, enforced in `src/app/admin/layout.tsx` via NextAuth + role check. Dashboard, profiles CRUD, calculation logs, formula audit, inbox, users, billing, QR-code tool. Sidebar entries come from `src/config/admin-nav.ts`.

   Deleted on purpose (don't recreate): `/admin/credentials` (stored a Supabase service-role key in plaintext localStorage), `/admin/playground` (duplicated `FreeFormulaCalculator`, which is embedded directly in the user portal instead), and the entire AI/MCP subsystem — `/admin/mcp`, `/admin/ai`, `/api/chat`, `/api/ai/*`, `/api/admin/ai-settings`, `src/lib/ai/`, `src/lib/ai-mcp/`, `src/components/ai/` — removed to cut LLM token cost; nothing else in the app depended on it (see git history around the removal commit if any of this needs resurrecting).

### Calculation flow (the core domain)

```
CalculatorForm → validations.ts (Zod) → calculate() → POST /api/calculations → supabaseAdmin.insert('calculations')
```

`calculate()` (`src/lib/calculations.ts:35`) is the deterministic math engine. `mix_type: 1` ("แบบผสมให้ได้", fixed total target volume) and `mix_type: 2` ("แบบผสมกับ", carrier volume is the reference) produce different results. **The server re-runs `calculate()` before insert — never trust client math.**

### Two formula representations (important)

Chemical profiles in `label_profiles` now carry an optional `formula` JSONB column (`supabase/migrations/20260802_add_formula_column.sql`), typed by `FormulaDefinition` in `src/lib/formula-schema.ts`. `meta.resultTemplate` selects the execution path, and `runFormula()` in `src/lib/formula-interpreter.ts` is the single dispatch point:

- `'tank-dilution'` → delegates to `calculate()` (the classic C/S/RA/mix_type math). Rendered by `ResultsDisplay`.
- `'generic-table'` → evaluated by `computeAll()` from `src/lib/formula-engine.ts` (arbitrary user-authored variables). Rendered by `GenericFormulaResults`.

Profiles without a `formula` column fall back to the legacy scalar columns (`C`, `S`, `RA`, `RA_unit`, `mix_type`, `A0`, `tankCapacity`). The four built-in presets were backfilled as `tank-dilution` definitions in `20260802_backfill_formula_jsonb.sql`. When adding a generic formula via `POST /api/profiles/from-formula`, those legacy scalar columns are written with dummy values purely for backward compat.

### Formula engine & playground

`src/lib/formula-engine.ts` is an Excel-like expression evaluator: variables have `name` + `expression` and may reference other variable names. Supported functions: `SUM`, `AVG`, `MIN`, `MAX`, `ROUND`, `CEIL`, `FLOOR`, `ABS`, `IF`, `POW`, `SQRT`, `LOG`, `LOG10`, `PI`, `SIN`, `COS`, `TAN`. Cycles are caught by topological sort. `DEFAULT_TEMPLATES` ships Deltacide ULV, Deltacide หมอกควัน, and Submarine หมอกควัน.

`FreeFormulaCalculator` drives this engine — used on the public calculator and embedded in the user portal (`/user`). Saving a formula does a **dry-run `computeAll()` on the server** and rejects any variable with an error before insert.

Expressions are parsed and evaluated by `src/lib/expr-parser.ts` (hand-rolled recursive-descent → AST → tree-walking interpreter). **Never reintroduce `eval`/`new Function` here** — identifiers resolve only against the caller-supplied scope, which is what keeps a stored formula from executing arbitrary code server-side or in other users' browsers.

`parseFormulaDefinition()` (`src/lib/formula-schema.ts`) validates the `formula` JSONB on read — rows can predate the current shape, so never cast straight to `FormulaDefinition`.

Currently unreferenced by production code (kept, not wired): `src/lib/formula-validator.ts` (has passing tests) and `src/lib/unit-registry.ts`.

### Auth (NextAuth v5, Credentials)

- `src/lib/auth.ts:37` — **only `role === 'ADMIN'` can log in.** Non-admin rows may exist in the DB but are rejected at the auth layer.
- `POST /api/register` creates `role: 'ADMIN'`, so it is **gated**: callers must already be an ADMIN, except while `isBootstrapAllowed()` (`src/lib/bootstrap.ts`) is true — i.e. the deployment has zero users and needs its first account. `/register` redirects to `/login` under the same rule. Leaving it open would hand full system control to anyone who reaches the URL.
- `POST /api/seed` is ADMIN-only for the same reason (it writes profiles and generates calculation rows).
- `trustHost: true`, JWT session strategy. Route handler at `src/app/api/auth/[...nextauth]/route.ts`.
- User names are **AES-256-CBC encrypted** at rest (`src/lib/encryption.ts`), decrypted in the JWT callback. Requires a 32-char `ENCRYPTION_KEY`.

### Two Supabase clients (`src/lib/supabase.ts`)

- `supabase` — anon key. Read-only in practice, and only in three places: `api/locations`, `admin/profiles/page.tsx`, `admin/inbox/page.tsx`.
- `supabaseAdmin` — service_role key, bypasses RLS. **The correct client for any mutation** and for anything auth-related; every API route that writes uses it.

(Older notes in `AGENTS.md` claim the anon client is used for writes in `api/seed` / `api/feedback` / `api/calculations/[id]` — that was fixed; all three now use `supabaseAdmin`.)

### Formula profiles & guest ownership

- `label_profiles` is **hard-delete only** (was soft-delete until Jul 2026); audit action is `DELETE`. `calculations.profileId` is `ON DELETE SET NULL`, so history survives. `isActive` remains, but only for approve/hide states.
- Anonymous users get a stable UUID in the `ddc_guest_owner` httpOnly cookie (`src/lib/guest-owner.ts`) and can only edit/delete formulas carrying their own `guestOwnerToken`.
- Every profile mutation is logged via `recordFormulaAudit()` (`src/lib/formula-audit.ts`) to `formula_audit_logs`, viewable at `/admin/audit`. That is distinct from calculation history at `/admin/logs`.

## Stack & Conventions

- **Next.js 16 App Router**, `output: 'standalone'` for Docker. **API route and page props are `params: Promise<>` / `searchParams: Promise<>`.**
- **Tailwind CSS v4** — `@import "tailwindcss"` in CSS, `@tailwindcss/postcss` in PostCSS. **There is no `tailwind.config.js`**; theme lives in CSS variables in `globals.css`.
- **Brand palette has one source of truth**: the `@theme` block in `globals.css` defines `--color-brand`, `-brand-dark`, `-brand-soft`, `-brand-ink`, `-brand-muted`, `-brand-line`, `-brand-cloud` (agency green sampled from the Ministry of Public Health seal). Use the generated utilities — `bg-brand`, `text-brand-dark`, `border-brand/20` — **never hardcode the hex**. `src/lib/theme.ts` mirrors the same values for the few components that need raw strings in inline styles; keep the two in sync.
- **React 18** despite `@types/react: ^19`.
- **shadcn/ui** primitives in `src/components/ui/` (Radix underneath); toasts via `sonner`.
- **Zod 4** (`src/lib/validations.ts`) + **react-hook-form** with `@hookform/resolvers/zod`.
- **Recharts** for charts; **Leaflet** for maps (dynamic import only, no SSR); **SheetJS (xlsx)** for Excel; **KaTeX** for rendering formulas.
- **No Prisma** — raw Supabase JS client throughout.
- Path alias `@/*` → `./src/*`.
- `src/app/actions/export.ts` is a `'use server'` server action (Excel export), not a Next.js convention directory.

## Environment Variables

Copy `.env.example` → `.env`. Missing vars warn rather than crash (fall back to `placeholder`).

| Var | Purpose |
|---|---|
| `AUTH_SECRET` | NextAuth JWT signing |
| `ENCRYPTION_KEY` | 32-char key for AES-256-CBC user-name encryption |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (or `_PUBLISHABLE_KEY`) public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | admin key, bypasses RLS. Note `src/lib/supabase.ts:11` prefers `SUPABASE_MANAGEMENT_SECRET` over this — a Management API token is *not* a valid PostgREST key, so setting both breaks every `supabaseAdmin` call |
| `API_SECRET_KEY` | shared secret with the C# Avalonia desktop app |

## Testing

Vitest, config in `vitest.config.ts`. Tests sit next to their source as `*.test.ts`.

Any test whose import chain reaches `@/lib/auth` (→ next-auth → `next/server`, unresolvable outside the Next runtime) must hoist `vi.mock('@/lib/auth')`.

## Database / Migrations

Schema lives in Supabase; migrations in `supabase/migrations/`. The root-level `fix_database.sql`, `fix_id_constraint.sql`, `supabase_schema_update.sql`, and `sql_migration_feedback.sql` are historical setup scripts — add new schema changes as migrations instead.

## Known Quirks

- `.github/workflows/supabase-keep-alive.yml` deliberately omits `actions/checkout` (avoids "dubious ownership" on Ubuntu runners) — it only `curl`s a health endpoint. `vercel.json` also pings `/api/calculations` on `0 0 * * 2,5` so the Supabase free tier doesn't hibernate.
- `mix_type` defaults to `1` almost everywhere; only seed data and the calculator form distinguish 1 vs 2.
- `npm audit` in CI fails only on `critical` — `xlsx` and `sharp`/libvips still carry unfixed `high` advisories.
