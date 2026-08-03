-- Agency-wide Stripe subscription that gates AI features (single-row table, not per-user).
CREATE TABLE IF NOT EXISTS public.billing_subscription (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "stripeCustomerId" TEXT NULL,
    "stripeSubscriptionId" TEXT NULL,
    status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'past_due', 'canceled', 'inactive')),
    "currentPeriodEnd" TIMESTAMPTZ NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.billing_subscription ENABLE ROW LEVEL SECURITY;
-- API routes use the service-role client after authorization (or Stripe webhook signature
-- verification); do not grant browser access.

-- Generic server-side key/value settings store, replacing localStorage for config that
-- should be shared across all admins (e.g. ai-provider-settings) rather than per-browser.
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- Same access model: service-role only, via admin-authenticated API routes.
