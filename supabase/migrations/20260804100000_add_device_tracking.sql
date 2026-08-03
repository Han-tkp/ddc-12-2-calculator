-- Device provenance, recorded alongside the GPS coordinates these tables already carry,
-- so "where was this entered" can be answered together with "from what".
--
-- Values are parsed from the request's User-Agent header SERVER-SIDE (src/lib/device-info.ts);
-- they are never read from a request body, which a client could forge.
--
-- Note on "deviceModel": Android User-Agents expose the real hardware model, but Apple
-- reports every handset as "iPhone" and every tablet as "iPad". On iOS this column holds
-- only the device family — that is a platform restriction, not a bug.

ALTER TABLE public.calculations
    ADD COLUMN IF NOT EXISTS "deviceOs" TEXT NULL,
    ADD COLUMN IF NOT EXISTS "deviceBrowser" TEXT NULL,
    ADD COLUMN IF NOT EXISTS "deviceModel" TEXT NULL;

ALTER TABLE public.formula_audit_logs
    ADD COLUMN IF NOT EXISTS "deviceOs" TEXT NULL,
    ADD COLUMN IF NOT EXISTS "deviceBrowser" TEXT NULL,
    ADD COLUMN IF NOT EXISTS "deviceModel" TEXT NULL;
