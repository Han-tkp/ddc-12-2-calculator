-- ============================================================================
-- ตรวจหาสูตรที่สัดส่วน C:S ถูกทบจนเจือจางเกินจริง (อ่านอย่างเดียว)
-- ============================================================================
--
-- ⚠️  สคริปต์นี้เป็น SELECT ล้วน ไม่มี UPDATE/DELETE ที่รันได้จริงแม้แต่บรรทัดเดียว
-- ⚠️  ห้ามนำผลลัพธ์ไป UPDATE ตรง ๆ โดยไม่ทานกับฉลากสารเคมีจริงก่อน
--     ค่าที่เห็นในคอลัมน์ "ค่าตั้งต้น" คือค่าที่ "เคยถูกกรอก" ไม่ใช่ค่าที่ "ถูกต้องตามฉลาก"
--     บางสูตรอาจกรอกผิดมาตั้งแต่แรก การกู้ค่าผิดคือมิสโดสสารเคมีที่เอาไปพ่นจริง
--
-- ที่มา: ก่อน commit ba302e1 ระบบเก็บ C/S เป็นสัดส่วนที่ย่อแล้ว แต่เก็บ C_unit/S_unit
-- เป็นหน่วยที่เจ้าหน้าที่พิมพ์ตอนกรอก พอเปิด dialog แก้ไขแล้วกดบันทึก หน่วยเดิมถูกเอาไป
-- คูณกับเลขที่ย่อไปแล้วซ้ำอีกรอบ สัดส่วนจึงเจือจางลง 1,000 เท่าทุกครั้งที่บันทึก
--     1:250  →  1:250,000  →  1:250,000,000  →  ...
--
-- วิธีจับ: formula_audit_logs.beforeData/afterData เก็บ snapshot ทั้งแถวของ label_profiles
-- (ดู src/app/api/profiles/[id]/route.ts) จึงเทียบสัดส่วนก่อน/หลังของทุกครั้งที่แก้ไขได้
--
-- เงื่อนไข "หน่วยไม่เปลี่ยน" สำคัญมาก: หลัง ba302e1 การสลับหน่วยที่ถูกต้องก็ทำให้เลข
-- กระโดด 1,000 เท่าเหมือนกัน (25 ลิตร → 25,000 มล.) แต่นั่นไม่ใช่บั๊ก เพราะหน่วยเปลี่ยนตาม
--
-- วิธีใช้: เปิด Supabase SQL Editor แล้วรันทีละบล็อก (คั่นด้วย ==== ) อ่านผลตามลำดับ
-- ============================================================================


-- ============================================================================
-- [1/3] inflation_events — ทุกครั้งที่สัดส่วนกระโดดผิดปกติ
-- ============================================================================
-- อ่านคอลัมน์ jump_factor: ~1000 คือโดนทบหนึ่งรอบ, ~1000000 คือสองรอบซ้อนในครั้งเดียว
WITH edits AS (
    SELECT
        l."formulaId",
        l."createdAt",
        l."actorLabel",
        l."actorType",
        COALESCE(l."afterData"->>'name', l."beforeData"->>'name') AS formula_name,
        NULLIF(l."beforeData"->>'C', '')::numeric AS before_c,
        NULLIF(l."beforeData"->>'S', '')::numeric AS before_s,
        NULLIF(l."afterData"->>'C', '')::numeric  AS after_c,
        NULLIF(l."afterData"->>'S', '')::numeric  AS after_s,
        l."beforeData"->>'C_unit' AS before_c_unit,
        l."beforeData"->>'S_unit' AS before_s_unit,
        l."afterData"->>'C_unit'  AS after_c_unit,
        l."afterData"->>'S_unit'  AS after_s_unit
    FROM public.formula_audit_logs l
    WHERE l.action IN ('UPDATE', 'ACTIVATE')
      -- แถว CREATE ไม่มี beforeData และ DELETE ไม่มี afterData
      AND jsonb_typeof(l."beforeData") = 'object'
      AND jsonb_typeof(l."afterData")  = 'object'
),
ratios AS (
    SELECT
        *,
        before_s / NULLIF(before_c, 0) AS before_ratio,
        after_s  / NULLIF(after_c, 0)  AS after_ratio
    FROM edits
    WHERE before_c > 0 AND before_s > 0 AND after_c > 0 AND after_s > 0
)
SELECT
    "formulaId",
    formula_name,
    "createdAt",
    "actorLabel",
    "actorType",
    before_c || ':' || before_s AS before_pair,
    after_c  || ':' || after_s  AS after_pair,
    ROUND(before_ratio, 4)      AS before_ratio,
    ROUND(after_ratio, 4)       AS after_ratio,
    ROUND(after_ratio / NULLIF(before_ratio, 0), 2) AS jump_factor,
    COALESCE(before_c_unit, 'ส่วน') || '/' || COALESCE(before_s_unit, 'ส่วน') AS units_unchanged
FROM ratios
WHERE after_ratio / NULLIF(before_ratio, 0) >= 100   -- เผื่อไว้กว้างกว่า 1000 เพื่อไม่ให้หลุด
  -- หน่วยต้องไม่เปลี่ยน ไม่งั้นเป็นการสลับหน่วยที่ถูกต้อง ไม่ใช่บั๊ก
  AND before_c_unit IS NOT DISTINCT FROM after_c_unit
  AND before_s_unit IS NOT DISTINCT FROM after_s_unit
ORDER BY formula_name, "createdAt";


-- ============================================================================
-- [2/3] original_values — ค่าที่กรอกไว้ครั้งแรกสุดของแต่ละสูตร
-- ============================================================================
-- ค่านี้มาจาก snapshot ตอน CREATE ซึ่งเกิดก่อนการทบทุกครั้ง
SELECT DISTINCT ON (l."formulaId")
    l."formulaId",
    l."afterData"->>'name'   AS formula_name,
    l."createdAt"            AS created_at,
    l."actorLabel"           AS created_by,
    (l."afterData"->>'C')    AS original_c,
    (l."afterData"->>'S')    AS original_s,
    COALESCE(l."afterData"->>'C_unit', 'ส่วน') AS original_c_unit,
    COALESCE(l."afterData"->>'S_unit', 'ส่วน') AS original_s_unit,
    l."afterData"->>'description' AS original_description  -- มักมีข้อความฉลากอยู่ ใช้ทานได้
FROM public.formula_audit_logs l
WHERE l.action = 'CREATE'
  AND jsonb_typeof(l."afterData") = 'object'
ORDER BY l."formulaId", l."createdAt";


-- ============================================================================
-- [3/3] repair_worksheet — ใบงานสำหรับเจ้าหน้าที่ทานกับฉลากจริง
-- ============================================================================
-- แถวที่ needs_review = 'ต้องกรอกใหม่จากฉลาก' คือแถวที่ไม่มี CREATE snapshot
-- (สร้างก่อนระบบ audit มีอยู่ — ดู migration 20260731060000) กู้ค่าตั้งต้นไม่ได้
WITH originals AS (
    SELECT DISTINCT ON (l."formulaId")
        l."formulaId",
        NULLIF(l."afterData"->>'C', '')::numeric AS original_c,
        NULLIF(l."afterData"->>'S', '')::numeric AS original_s,
        l."afterData"->>'C_unit' AS original_c_unit,
        l."afterData"->>'S_unit' AS original_s_unit
    FROM public.formula_audit_logs l
    WHERE l.action = 'CREATE'
      AND jsonb_typeof(l."afterData") = 'object'
    ORDER BY l."formulaId", l."createdAt"
),
inflations AS (
    SELECT
        l."formulaId",
        COUNT(*) AS inflation_count
    FROM public.formula_audit_logs l
    WHERE l.action IN ('UPDATE', 'ACTIVATE')
      AND jsonb_typeof(l."beforeData") = 'object'
      AND jsonb_typeof(l."afterData")  = 'object'
      AND NULLIF(l."beforeData"->>'C', '')::numeric > 0
      AND NULLIF(l."beforeData"->>'S', '')::numeric > 0
      AND NULLIF(l."afterData"->>'C', '')::numeric  > 0
      AND NULLIF(l."afterData"->>'S', '')::numeric  > 0
      AND (NULLIF(l."afterData"->>'S','')::numeric  / NULLIF(l."afterData"->>'C','')::numeric)
        / NULLIF(NULLIF(l."beforeData"->>'S','')::numeric / NULLIF(l."beforeData"->>'C','')::numeric, 0) >= 100
      AND (l."beforeData"->>'C_unit') IS NOT DISTINCT FROM (l."afterData"->>'C_unit')
      AND (l."beforeData"->>'S_unit') IS NOT DISTINCT FROM (l."afterData"->>'S_unit')
    GROUP BY l."formulaId"
)
SELECT
    p.id,
    p.name,
    p.description,                                        -- ข้อความฉลากสำหรับทาน
    p."C" || ' / ' || p."S" AS current_pair,
    ROUND(p."S"::numeric / NULLIF(p."C"::numeric, 0), 2) AS current_ratio,
    o.original_c || ' / ' || o.original_s AS original_pair,
    ROUND(o.original_s / NULLIF(o.original_c, 0), 2) AS original_ratio,
    i.inflation_count,
    ROUND((p."S"::numeric / NULLIF(p."C"::numeric, 0))
        / NULLIF(o.original_s / NULLIF(o.original_c, 0), 0), 2) AS total_drift_factor,
    CASE
        WHEN o."formulaId" IS NULL THEN 'ต้องกรอกใหม่จากฉลาก (ไม่มีประวัติตอนสร้าง)'
        ELSE 'ทานกับฉลากแล้วค่อยแก้'
    END AS needs_review,
    -- ข้อความเฉย ๆ สำหรับคัดลอกไปรันหลังทานฉลากแล้ว ไม่ใช่คำสั่งที่รันเอง
    format(
        'UPDATE public.label_profiles SET "C" = %s, "S" = %s WHERE id = %L;  -- %s',
        COALESCE(o.original_c::text, '<ใส่ค่าจากฉลาก>'),
        COALESCE(o.original_s::text, '<ใส่ค่าจากฉลาก>'),
        p.id,
        p.name
    ) AS suggested_update_review_first
FROM public.label_profiles p
JOIN inflations i ON i."formulaId" = p.id
LEFT JOIN originals o ON o."formulaId" = p.id
ORDER BY i.inflation_count DESC, p.name;
