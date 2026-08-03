-- Add formula JSONB column to label_profiles
ALTER TABLE public.label_profiles
  ADD COLUMN IF NOT EXISTS formula jsonb;