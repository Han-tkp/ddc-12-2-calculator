-- Backfill C_unit/S_unit for rows created before migration 20260810120000_add_cs_units.sql.
-- Every label formula on file (see .agent/skills/my-skills/เอกสาร/คำนวณสารเคมี*.txt) expresses
-- the concentrate:carrier ratio in liters on both sides (e.g. "เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 79 ลิตร").
-- Metadata-only: does not touch C, S, RA, or A0, so no calculation changes.
UPDATE public.label_profiles
SET "C_unit" = 'L'
WHERE "C_unit" IS NULL;

UPDATE public.label_profiles
SET "S_unit" = 'L'
WHERE "S_unit" IS NULL;
