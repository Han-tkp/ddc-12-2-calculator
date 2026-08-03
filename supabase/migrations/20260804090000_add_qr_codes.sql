-- Saved QR codes. The generated image encodes a system short link (/q/<id>) that
-- redirects to "targetUrl", rather than encoding targetUrl directly. That indirection
-- is the whole point of allowing edits: signage already printed and posted in the field
-- keeps working when an admin repoints the destination.
CREATE TABLE IF NOT EXISTS public.qr_codes (
    -- Short, URL-safe slug. This IS the /q/<id> path segment, so it is generated
    -- application-side rather than being a UUID (shorter slug = denser, more scannable code).
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Soft delete. A hard delete would erase "when was this retired", which is exactly
    -- the CRUD history this table exists to answer; it also lets /q/<id> tell a field
    -- officer scanning a retired sign that the link was withdrawn instead of 404ing.
    "deletedAt" TIMESTAMPTZ NULL,
    "createdBy" TEXT NULL,
    "updatedBy" TEXT NULL
);

CREATE INDEX IF NOT EXISTS qr_codes_active_idx
    ON public.qr_codes ("createdAt" DESC)
    WHERE "deletedAt" IS NULL;

ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
-- Service-role only, same access model as billing_subscription/app_settings: all reads
-- and writes go through admin-authenticated API routes (plus the public /q/<id> redirect,
-- which also runs server-side via supabaseAdmin).

-- Atomic scan counter. Doing this as read-then-write in the route would drop counts
-- whenever two people scan the same sign at once.
CREATE OR REPLACE FUNCTION public.increment_qr_scan(qr_id TEXT)
RETURNS void
LANGUAGE sql
AS $$
    UPDATE public.qr_codes
    SET "scanCount" = "scanCount" + 1
    WHERE id = qr_id AND "deletedAt" IS NULL;
$$;
