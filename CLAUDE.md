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

`calculate()` (`src/lib/calculations.ts:35`) is the deterministic math engine. `mix_type: 1` ("แบบผสมให้ได้", `S` is the finished total) and `mix_type: 2` ("แบบผสมกับ", `S` is the carrier alone) differ only in the concentration `fC` they derive — not in the volume prepared. **The server re-runs `calculate()` before insert — never trust client math.**

**`S` means different things per `mix_type` — it is always the number printed on the bottle, never a hand-computed one:**

- `mix_type: 1` → `S` is the **net total** ("1 ลิตร ผสมน้ำมันให้ได้ 14 ลิตร" → `S = 14`), so `fC = C / S`.
- `mix_type: 2` → `S` is the **carrier alone** ("1 ลิตร ผสมกับน้ำมัน 79 ลิตร" → `S = 79`), so `fC = C / (C + S)`.

Until Aug 2026 mode 1 also used `C / (C + S)`, which required officers to enter `14 - 1 = 13` themselves. Nobody did, so every "ผสมให้ได้" profile was diluted by one extra part (7% off at 1:14). Don't reintroduce the subtraction — `20260817_fix_mix_type_1_total_volume.sql` migrated the seeded presets to totals, and user-authored rows already held totals.

**`V_total` is always `RA_cc × (N × A_house) / A0` — `mix_type` only selects `fC`.** The label's spray rate applies to the *finished mixture* ("นำส่วนผสมนี้ไปฉีดพ่นในอัตรา 1.25 ลิตร ต่อ 10,000 ตร.ม."), so the volume to prepare equals the reference volume in both modes; the mode only decides how that volume splits into chemical and carrier. Mode 2 previously set `V_S = V_total_ref` and added chemical on top, over-preparing by `C/S` — 25% at 1:4. Officer-supplied definition and the agency's own worked examples (`.agent/skills/my-skills/เอกสาร/คำนวณสารเคมี.txt`) both pin this; `calculations.test.ts` holds all four as ground truth.

`V_C_1L` / `V_S_1L` keep their mode-specific meaning on purpose: mode 2 pins `V_S_1L = 1000` because "ผสมกับ" is physically measured by starting from 1 L of carrier and pouring chemical in on top, which is what the agency document's "สารเคมี 250 cc และน้ำมันดีเซล 1,000 cc" describes.

`targetVolume` is the **total** volume the officer wants to prepare in both modes, so `V_C_target + V_S_target === targetVolume * 1000` always. Note that `V_C_1L` / `V_S_1L` do *not* follow that rule under `mix_type: 2`: there they are per litre of *carrier* (`V_S_1L` is pinned at 1000), which is what the "ตัวตั้งต้น 1,000" caption in `ResultsDisplay` means.

### C/S units (`src/lib/cs-units.ts`)

`label_profiles.C` / `.S` hold **the numbers as typed off the bottle**, and `C_unit` / `S_unit` are the real units of those numbers. Unit conversion happens **only at calculation time**, via `normalizeCSForCalc()`. Never call `simplifyRatio()` on a value about to be persisted.

Until Aug 2026 it was the reverse: saves ran `simplifyRatio()` first and `C_unit`/`S_unit` recorded only what the officer had typed, so the pair contradicted itself. Typing `100 มล. : 25 ลิตร` stored `C=1, S=250` beside units `cc`/`L` — which reads as 1:250,000. Two failures followed: officers re-entered the label numbers and watched them snap back to the same reduced pair ("ค่าไม่เปลี่ยน"), and re-opening the edit dialog re-multiplied the already-reduced numbers by their old units, **compounding S by 1000× on every save** (`1:250 → 1:250,000 → 1:250,000,000`).

Consequences for anything touching C/S:

- Seed every edit dialog through `csEditState()` and save through `csSavePayload()`. `csSavePayload(csEditState(p))` must be an identity — `cs-units.test.ts` pins it.
- **Units are a pair.** Both present or both `null`; never default one side alone, which is exactly the shape of the 1000× bug. `applyCSUnitChoice()` enforces this when a unit dropdown changes, and `profileMutationSchema` rejects a half-set pair at the API.
- `null` on both means a unit-less ratio, rendered "ส่วน" by `formatCSUnitLabel()`. `20260817120000_make_cs_units_self_consistent.sql` moved every self-contradicting row into that state (metadata only — no numeric column touched, so no ratio moved).
- The `calculations` table still stores the **normalized** pair, so exports, logs, and dashboards that read it need no changes.

`calculate()` depends only on the C:S ratio, so scaling both sides changes nothing (`calculations.test.ts` pins this). That is what makes storing the typed numbers safe.

Rows edited under the old model before `ba302e1` may still hold an inflated `S`. `supabase/forensics/find_inflated_cs_ratios.sql` (SELECT-only, run by hand in the Supabase SQL editor — it is deliberately **not** under `migrations/`) reconstructs each ratio's history from `formula_audit_logs` snapshots and emits a review worksheet. It flags a jump only when the units did *not* change, so a legitimate unit switch isn't a false positive. Never apply its suggested UPDATEs without checking them against the physical labels.

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

## Time: every "day" is a Thai day

`src/lib/thai-time.ts` is the only place that converts time, and it never reads the machine's timezone. Vercel and the Docker image run UTC, seven hours behind Thailand, so `startOfDay()`/`format()` from date-fns bucketed the 00:00–07:00 Thai window — exactly when fogging runs happen — into the previous day, and printed every timestamp seven hours early. Thailand has been a fixed UTC+07:00 with no DST since 1920, so the module uses a constant offset rather than a tz database.

Use `thaiStartOfDay()` / `thaiEndOfDay()` for every `createdAt` range filter, `thaiDayKey()` for daily bucketing, and the `formatThai*` helpers for any **server-side** rendering of a date. Client components inherit the officer's browser timezone and are already correct, but the export button uses the helpers anyway so an admin abroad gets Thai timestamps in the file. Note `toLocaleString('th-TH')` alone does **not** change the timezone — only `timeZone: 'Asia/Bangkok'` does.

## Reading more than 1,000 rows

PostgREST caps a response at 1,000 rows and truncates silently — no error, no warning. Any query that must cover a whole date range (dashboard aggregates, the user portal, `getExportData`) goes through `fetchAllRows()` in `src/lib/fetch-all-rows.ts`, which pages with `.range()` until exhausted and reports `truncated` when it hits `DEFAULT_MAX_ROWS`; the dashboard renders a banner in that case. Paginated tables that deliberately show one page keep their own `.range()`.

`src/lib/calculation-filters.ts` holds the `/admin/logs` filter rules (date, keyword, role) so the page and its Excel button always select the same rows — the export used to send only the date range and produced a file wider than what was on screen.

## Database / Migrations

Schema lives in Supabase; migrations in `supabase/migrations/`. The root-level `fix_database.sql`, `fix_id_constraint.sql`, `supabase_schema_update.sql`, and `sql_migration_feedback.sql` are historical setup scripts — add new schema changes as migrations instead.

## Known Quirks

- `.github/workflows/supabase-keep-alive.yml` deliberately omits `actions/checkout` (avoids "dubious ownership" on Ubuntu runners) — it only `curl`s a health endpoint. `vercel.json` also pings `/api/calculations` on `0 0 * * 2,5` so the Supabase free tier doesn't hibernate.
- `mix_type` defaults to `1` almost everywhere; only seed data and the calculator form distinguish 1 vs 2.
- `npm audit` in CI fails only on `critical` — `xlsx` and `sharp`/libvips still carry unfixed `high` advisories.
