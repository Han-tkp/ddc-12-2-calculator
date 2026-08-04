-- Optional, per-profile help text explaining default/result values (e.g. why A0
-- defaults to 1000, what a mix_type means for this specific formula). Flat map
-- of fieldKey -> Thai explanation string, additive to the existing hardcoded
-- explanations in ResultsDisplay — profiles without it render exactly as before.
ALTER TABLE public.label_profiles ADD COLUMN IF NOT EXISTS "resultHelp" JSONB;
