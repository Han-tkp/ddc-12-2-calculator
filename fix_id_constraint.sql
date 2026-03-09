-- 1. ตรวจสอบ Extension สำหรับ UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. จัดการตาราง label_profiles
ALTER TABLE public.label_profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.label_profiles ALTER COLUMN "isActive" SET DEFAULT true;
ALTER TABLE public.label_profiles ALTER COLUMN "isDefault" SET DEFAULT false;
ALTER TABLE public.label_profiles ALTER COLUMN mix_type SET DEFAULT 1;
ALTER TABLE public.label_profiles ALTER COLUMN "createdAt" SET DEFAULT NOW();
ALTER TABLE public.label_profiles ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- 3. จัดการตาราง users
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.users ALTER COLUMN "createdAt" SET DEFAULT NOW();
ALTER TABLE public.users ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- 4. จัดการตาราง calculations
-- เพิ่มคอลัมน์ updatedAt หากยังไม่มี
ALTER TABLE public.calculations ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
-- ตั้งค่า DEFAULT ให้คอลัมน์ที่มีอยู่
ALTER TABLE public.calculations ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.calculations ALTER COLUMN "createdAt" SET DEFAULT NOW();
ALTER TABLE public.calculations ALTER COLUMN "updatedAt" SET DEFAULT NOW();

-- 5. จัดการตาราง feedbacks (ตรวจสอบและสร้าง)
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
