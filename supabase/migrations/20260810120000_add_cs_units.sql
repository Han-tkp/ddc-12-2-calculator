-- Records which unit (L / cc) the admin originally picked for C and S when adding
-- or editing a formula. Purely informational for display in the admin/user tables
-- ("สารเคมีออกฤทธิ์ (C) หน่วย: ..."). The stored C/S values themselves remain the
-- normalized-and-simplified ratio used by calculate() — these columns are never
-- read by the calculation engine, only shown alongside the numbers.
-- Existing rows get NULL (rendered as "ส่วน" — unknown/legacy, matches prior behaviour).
ALTER TABLE public.label_profiles ADD COLUMN IF NOT EXISTS "C_unit" TEXT CHECK ("C_unit" IN ('L', 'cc'));
ALTER TABLE public.label_profiles ADD COLUMN IF NOT EXISTS "S_unit" TEXT CHECK ("S_unit" IN ('L', 'cc'));
