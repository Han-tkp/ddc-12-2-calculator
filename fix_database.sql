-- 1. เพิ่มคอลัมน์ประเภทการผสม (mix_type) ให้ตาราง label_profiles และ calculations
ALTER TABLE public.label_profiles ADD COLUMN IF NOT EXISTS mix_type INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE public.calculations ADD COLUMN IF NOT EXISTS mix_type INTEGER DEFAULT 1 NOT NULL;

-- 1.1 เพิ่มคอลัมน์ agency (หน่วยงาน/ผู้บันทึก) ให้ตาราง calculations
ALTER TABLE public.calculations ADD COLUMN IF NOT EXISTS agency TEXT;

-- 2. ลบสูตรรุ่นเก่าที่เป็นค่าเริ่มต้นออก (เพื่อไม่ให้ซ้ำกับสูตรใหม่)
DELETE FROM public.label_profiles WHERE "isDefault" = true;

-- 3. ลบสูตรเดิมที่อาจจะเคยเพิ่มไปเองแล้วผิดพลาดออกก่อน (Optional แต่เพื่อความคลีน)
DELETE FROM public.label_profiles WHERE name IN ('Deltacide (หมอกควัน)', 'Deltacide (ULV)', 'Submarine (หมอกควัน)', 'Submarine (ULV)', 'ฉีดพ่น 1:39', 'หมอกควัน 1:79');

-- 4. เพิ่มสูตรใหม่ที่ถูกต้องตามเอกสาร และตั้งให้เป็น "ปกติ (isDefault = false)" เพื่อให้แอดมินแก้ไข/ลบได้อิสระ
INSERT INTO public.label_profiles 
(id, name, description, "C", "S", "RA", "RA_unit", mix_type, "A0", "isActive", "isDefault", "updatedAt")
VALUES 
(uuid_generate_v4(), 'Deltacide (หมอกควัน)', 'เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 79 ลิตร', 1, 79, 1, 'L', 2, 1000, true, false, NOW()),
(uuid_generate_v4(), 'Deltacide (ULV)', 'เดลตาไซด์ 1 ลิตร ผสมน้ำมัน 4 ลิตร', 1, 4, 75, 'cc', 2, 1000, true, false, NOW()),
(uuid_generate_v4(), 'Submarine (หมอกควัน)', 'ซับมาริน 1 ลิตร ผสมน้ำมันดีเซลให้ได้ 250 ลิตร (อัตรา 1:249)', 1, 249, 1.25, 'L', 1, 1000, true, false, NOW()),
(uuid_generate_v4(), 'Submarine (ULV)', 'ซับมาริน 1 ลิตร ผสมน้ำให้ได้ 40 ลิตร (อัตรา 1:39)', 1, 39, 2, 'L', 1, 10000, true, false, NOW());

-- (แถม) สร้างตาราง feedbacks สำหรับฟอร์มร้องขอสูตร
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    message TEXT,
    contact VARCHAR(255),
    "formulaData" JSONB,
    status VARCHAR(50) DEFAULT 'NEW',
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
