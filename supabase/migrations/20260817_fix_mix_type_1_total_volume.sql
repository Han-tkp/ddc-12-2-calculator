-- โหมด "ผสมให้ได้" (mix_type = 1) เปลี่ยนความหมายของ S จาก "ตัวทำละลายล้วน" เป็น "ยอดรวมสุทธิ"
-- ตามฉลาก (calculate() เดิมคิด C/(C+S) ทำให้ตัวหารเกินไป 1 ส่วน)
--
-- สูตรที่ผู้ใช้สร้างเองกรอก S เป็นยอดรวมตามฉลากอยู่แล้ว จึงกลายเป็นค่าที่ถูกต้องทันที
-- ที่ต้องแก้คือสูตรตั้งต้น 4 ตัวเท่านั้น เพราะถูก seed ตามธรรมเนียมเดิม (S = ยอดรวม - C)
-- ทุกคำสั่งจำกัดด้วยทั้งชื่อและค่า S เดิม จึงไม่แตะสูตรที่ถูกแก้ไปแล้วและรันซ้ำได้อย่างปลอดภัย

UPDATE public.label_profiles SET "S" = 80
WHERE name = 'Deltacide (หมอกควัน)' AND "mix_type" = 1 AND "S" = 79;

UPDATE public.label_profiles SET "S" = 250
WHERE name = 'Submarine (หมอกควัน)' AND "mix_type" = 1 AND "S" = 249;

UPDATE public.label_profiles SET "S" = 40
WHERE name = 'Submarine (ULV)' AND "mix_type" = 1 AND "S" = 39;

UPDATE public.label_profiles SET "S" = 5
WHERE name = 'Deltacide (ULV)' AND "mix_type" = 1 AND "S" = 4;

-- คอลัมน์ formula JSONB (resultTemplate = 'tank-dilution') ถือค่า S ซ้ำอีกชุดหนึ่ง
-- ต้องขยับให้ตรงกับคอลัมน์ scalar ไม่งั้น runFormula() จะคำนวณคนละค่ากับหน้าแก้ไขสูตร
UPDATE public.label_profiles
SET formula = jsonb_set(
    formula,
    '{inputs}',
    (
        SELECT jsonb_agg(
            CASE
                WHEN input->>'name' = 'S'
                    THEN input || jsonb_build_object('expression', "S"::text, 'default', "S")
                ELSE input
            END
        )
        FROM jsonb_array_elements(formula->'inputs') AS input
    )
)
WHERE formula IS NOT NULL
  AND formula->'meta'->>'resultTemplate' = 'tank-dilution'
  AND jsonb_typeof(formula->'inputs') = 'array'
  AND name IN ('Deltacide (หมอกควัน)', 'Deltacide (ULV)', 'Submarine (หมอกควัน)', 'Submarine (ULV)');
