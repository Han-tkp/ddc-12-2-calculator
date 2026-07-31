CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Allow guest users to manage only the formulas they created in the same browser.
ALTER TABLE public.label_profiles
ADD COLUMN IF NOT EXISTS "guestOwnerToken" UUID;

-- Anonymous users have no users.id; keep the existing creator relation nullable.
ALTER TABLE public.label_profiles
ALTER COLUMN "createdById" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS label_profiles_guest_owner_idx
ON public.label_profiles ("guestOwnerToken");

-- Immutable server-side audit trail for formula CRUD actions.
CREATE TABLE IF NOT EXISTS public.formula_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "formulaId" UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'ACTIVATE', 'DEACTIVATE', 'DELETE')),
    "actorType" TEXT NOT NULL CHECK ("actorType" IN ('ADMIN', 'GUEST')),
    "actorUserId" UUID NULL,
    "guestOwnerToken" UUID NULL,
    "actorLabel" TEXT NULL,
    location TEXT NULL,
    lat DOUBLE PRECISION NULL,
    lng DOUBLE PRECISION NULL,
    "beforeData" JSONB NULL,
    "afterData" JSONB NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS formula_audit_logs_formula_id_idx
ON public.formula_audit_logs ("formulaId", "createdAt" DESC);

ALTER TABLE public.formula_audit_logs ENABLE ROW LEVEL SECURITY;
-- API routes use the service-role client after authorization; do not grant browser access.
