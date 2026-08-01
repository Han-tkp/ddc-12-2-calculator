# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VBDC 12.2 Chemical Calculator** — a Next.js 16 web app for the Songkhla Vector-Borne Disease Control Center (DDC 12.2) that helps field officers compute chemical mixing ratios (Deltacide, Submarine, etc.) for dengue-vector fogging/ULV spraying. Built in Thai. Deployed to Vercel, backed by Supabase (Postgres), authenticated via NextAuth, with an optional multi-provider AI chatbot that acts as an MCP intermediary against Supabase data.

Domain language: สารออกฤทธิ์ = active ingredient (C), ตัวทำละลาย = solvent/carrier (S), หลังบ้าน = houses, ถัง = tank. All user-facing strings are in Thai (lang="th") — do not translate UI labels to English.

## Dev Commands

```bash
npm run dev          # Turbopack dev server on port 3000
npm run build        # Next.js standalone output (used by Dockerfile)
npm run start        # Production server on port 3000
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm run typecheck    # tsc --noEmit
npm test             # vitest run (uses vitest.config.ts for `@/*` alias)
npx vitest run src/lib/calculations.test.ts   # Run a single test file
```

Docker: `docker compose up --build -d` (port 3000, reads `.env`). Vercel cron at `vercel.json` pings `/api/calculations` every Tue/Fri 00:00 UTC to keep Supabase free-tier awake.

**Port is always 3000** — dev, Docker, and production. Never 3001.

## Architecture: Big Picture

The app has **three concentric rings** of features:

1. **Public calculator** (`/`) — anonymous users can run calculations, browse chemical presets, and manage their own custom formulas via a `guestOwnerToken` UUID cookie. The calculator form (`src/components/calculator/calculator-form.tsx`) → `calculate()` in `src/lib/calculations.ts` → POST `/api/calculations` → Supabase insert.
2. **User portal** (`/user`) — log in to see calculation history and personal data.
3. **Admin panel** (`/admin/*`) — ADMIN-only (`src/app/admin/layout.tsx` enforces this via NextAuth + role check; also see `src/lib/auth.ts:37`). Dashboard, logs, profiles CRUD, audit history, AI settings, credentials, playground.

### Calculation flow (the core domain)

```
CalculatorForm → validations.ts (Zod) → calculate() in calculations.ts → /api/calculations → supabaseAdmin.insert('calculations')
```

`calculate()` in `src/lib/calculations.ts:35` is the deterministic math engine — `mix_type: 1` ("ผสมให้ได้", fixed total volume) vs `mix_type: 2` ("ผสมกับ", carrier-referenced) produce different results. Server re-runs `calculate()` for integrity before saving.

### Auth (NextAuth v5, Credentials)

- `src/lib/auth.ts` — only `role === 'ADMIN'` can log in. `POST /api/register` creates `role: 'ADMIN'` by default.
- `trustHost: true`, JWT session strategy.
- User names are **AES-256-CBC encrypted** before storage (`src/lib/encryption.ts`). Decrypted on read in the JWT callback. Requires `ENCRYPTION_KEY` (32 chars) in `.env`.

### Two Supabase clients (`src/lib/supabase.ts`)

- `supabase` — anon key. Used for public reads but **also in some API routes that write** (`api/seed`, `api/calculations/[id]`, `api/feedback`). These will fail with RLS if RLS is enabled.
- `supabaseAdmin` — service_role key. Bypasses RLS. **The correct client for any API mutation** (profiles CRUD, users CRUD, calculations insert).

### Formula profiles & guest ownership

- Chemical profiles live in `label_profiles`. **Hard-delete only** (was soft-delete until Jul 2026). Audit log action `DELETE`. `calculations.profileId` FK is `ON DELETE SET NULL` — history is preserved.
- `isActive` still exists for approve/hide states (UI "activate" button) but delete = permanent.
- Anonymous users get a stable `guestOwnerToken` UUID via `ddc_guest_owner` httpOnly cookie (`src/lib/guest-owner.ts`). Guests can only edit/delete their own formulas.
- All CRUD on profiles is logged to `formula_audit_logs` via `recordFormulaAudit()` (`src/lib/formula-audit.ts`). View at `/admin/audit`. Calculation history (separate table) is at `/admin/logs`.

### AI / MCP chatbot

- `src/lib/ai-mcp.ts` is the **MCP intermediary**: classifies user intent → calls Supabase (queries or RPC) → returns results. The LLM **never computes** — it only orchestrates data fetches and tool calls.
- **Calculation is always deterministic**: the `calculate_formula` MCP tool (`src/lib/ai/tools.ts` → `buildCalculationResponse` in `src/lib/ai-mcp/fallback.ts`) calls the same `calculate()` engine as the app UI. The LLM/rule-based fallback must never compute volumes by hand — it only maps user language to parameters (C, S, RA, RA_unit, N, mix_type) and returns the engine's numbers.
- `src/lib/ai/router.ts` provides multi-provider fallback: `DEFAULT_ORDER = ['gemini', 'anthropic', 'openrouter', 'openai']`. Only retries on transient errors (429, timeout, network); does NOT fall back on auth/key/invalid errors.
- `src/lib/ai/agent.ts` is the LLM tool-calling loop.
- Configured via `/admin/ai` (per-provider model overrides, enable/disable, order) → persisted to DB → read by `runChatAgent` at request time.
- Falls back to rule-based `classifyIntent` when no provider is configured.
- Quota guard via `AI_MAX_REQUESTS_PER_MINUTE` / `AI_MAX_REQUESTS_PER_HOUR` env vars (optional).

### Formula Playground (`/admin/playground`)

`src/lib/formula-engine.ts` is an Excel-like expression evaluator: variables with `name` + `expression` referencing other variable names. Supports `SUM`, `AVG`, `MIN`, `MAX`, `ROUND`, `CEIL`, `FLOOR`, `ABS`, `IF`, `POW`, `SQRT`, `LOG`, `LOG10`, `PI`, `SIN`, `COS`, `TAN`. Cycles are detected via topological sort. `DEFAULT_TEMPLATES` ships Deltacide ULV, Deltacide หมอกควัน, Submarine หมอกควัน templates.

## Stack & Conventions

- **Next.js 16 App Router** with Turbopack. `next.config.js` sets `output: 'standalone'` for Docker.
- **Tailwind CSS v4**: uses `@import "tailwindcss"` in CSS, `@tailwindcss/postcss` in PostCSS config. **No `tailwind.config.js`** — theme is configured via CSS variables in `globals.css`.
- **React 18** (despite `@types/react: ^19`).
- **shadcn/ui** primitives in `src/components/ui/` (Radix under the hood) — `Button`, `Card`, `Dialog`, `Form`, `Select`, `Tabs`, `Sheet`, `Table`, `Pagination`, `Dropdown`, `Sonner` (toast), etc.
- **Zod 4** for validation (`src/lib/validations.ts`).
- **react-hook-form** + `@hookform/resolvers/zod` for forms.
- **Recharts** for analytics charts; **Leaflet** via `react-leaflet` for maps (must be dynamically imported — no SSR).
- **SheetJS (xlsx)** for Excel export.
- **KaTeX** for displaying formulas on admin pages.
- **No Prisma** — raw Supabase JS client throughout.
- **API routes & page props use `params: Promise<>` and `searchParams: Promise<>`** (Next.js 16 pattern).
- Path alias: `@/*` → `./src/*`.
- `app/actions/` contains a single server action (`export.ts`), not Next.js `actions` — these are `'use server'` functions.

## Environment Variables

Required in `.env` (copy from `.env.example`):

| Var | Purpose |
|---|---|
| `AUTH_SECRET` | NextAuth JWT signing |
| `ENCRYPTION_KEY` | 32-char key for AES-256-CBC user name encryption |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (or `_PUBLISHABLE_KEY`) public client key |
| `SUPABASE_SERVICE_ROLE_KEY` | (or `SUPABASE_MANAGEMENT_SECRET`) admin key, bypasses RLS |
| `API_SECRET_KEY` | shared secret with the C# Avalonia desktop app |
| `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` / `OPENAI_API_KEY` | AI provider keys (any subset) |
| `AI_MAX_REQUESTS_PER_MINUTE` / `AI_MAX_REQUESTS_PER_HOUR` | optional quota guard |

Missing env vars print a warning but don't crash the server (uses `placeholder`).

## Testing

- Vitest via `vitest.config.ts` (registers `@/*` alias; splits `unit` and `legacy` projects). Tests live next to source as `*.test.ts`. Cover: `calculations`, `encryption`, `formula-validator`, `ai-mcp`, `ai-mcp/crud`, `ai/ai`, `ai/ai-providers`.
- Tests that import modules reaching `@/lib/auth` (next-auth → `next/server`) must `vi.mock('@/lib/auth')` etc. — see `crud.test.ts` / `ai.test.ts` for the hoisted-mock pattern. Next.js 16 + Node ESM cannot resolve `next/server` outside the Next runtime.

## Database / Migrations

- No Prisma. Schema lives in Supabase. Migration files in `supabase/migrations/`.
- Root has ad-hoc fix scripts: `fix_database.sql`, `fix_id_constraint.sql`, `supabase_schema_update.sql`, `sql_migration_feedback.sql` — these were used during initial setup; prefer new changes via Supabase migrations.
- Supabase MCP server is configured at `.gemini/settings.json` (read-only by default; the dashboard auth uses `ddc_guest_owner` cookie ownership model).

## Known Quirks / Gotchas

- The `.github/workflows/supabase-keep-alive.yml` deliberately omits `actions/checkout` to avoid "dubious ownership" warnings on Ubuntu runners — it only does a `curl` ping.
- NextAuth credentials provider sits at `src/app/api/auth/[...nextauth]/route.ts`.
- `supabase` (anon) is used for reads on the inbox page (`src/app/admin/inbox/page.tsx`) — fine because reads are public.
- The `app/actions/export.ts` server action handles Excel downloads.
- Calculation results are always re-computed server-side before insert — never trust client math.
- `mix_type` defaults to `1` everywhere; only the seed data and the calculator form distinguish 1 vs 2.

## Files Worth Knowing

- `src/lib/calculations.ts` — core math (mix types, target volumes, tank counts)
- `src/lib/validations.ts` — Zod schemas for all API inputs
- `src/lib/auth.ts` — NextAuth config with ADMIN-only gate
- `src/lib/supabase.ts` — anon vs admin client
- `src/lib/encryption.ts` — AES-256-CBC for user names
- `src/lib/formula-engine.ts` — expression evaluator + templates
- `src/lib/ai-mcp.ts` — MCP intermediary (intent → Supabase)
- `src/lib/ai/router.ts` — multi-provider fallback logic
- `src/lib/guest-owner.ts` — anonymous UUID cookie for formula ownership
- `src/lib/formula-audit.ts` — CRUD audit logger
- `src/config/admin-nav.ts` — admin sidebar navigation source of truth
- `src/lib/constants.ts` — chemical presets (Deltacide/Submarine ULV & หมอกควัน)
- `supabase/migrations/20260731060000_formula_ownership_and_audit.sql` — ownership + audit schema
