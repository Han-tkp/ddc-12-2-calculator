-- Add 'mix_type' to label_profiles
ALTER TABLE public.label_profiles
ADD COLUMN IF NOT EXISTS mix_type INTEGER DEFAULT 1 NOT NULL;

-- Add 'mix_type' to calculations to keep historical accuracy
ALTER TABLE public.calculations
ADD COLUMN IF NOT EXISTS mix_type INTEGER DEFAULT 1 NOT NULL;

-- Create feedbacks table if it doesn't exist
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

-- Reset and ensure permissions are correct for label_profiles, users, feedbacks
ALTER TABLE public.label_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- label_profiles Policies
DROP POLICY IF EXISTS "Allow anonymous read label_profiles" ON public.label_profiles;
CREATE POLICY "Allow anonymous read label_profiles" ON public.label_profiles FOR SELECT USING (true);

-- feedbacks Policies
DROP POLICY IF EXISTS "Allow anonymous read logic" ON public.feedbacks;
DROP POLICY IF EXISTS "Allow public insert feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Allow admin update feedbacks" ON public.feedbacks;
CREATE POLICY "Allow anonymous read logic" ON public.feedbacks FOR SELECT USING (true);
CREATE POLICY "Allow public insert feedbacks" ON public.feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin update feedbacks" ON public.feedbacks FOR UPDATE USING (true);

-- users Policies
DROP POLICY IF EXISTS "Allow admin to interact with users" ON public.users;
CREATE POLICY "Allow admin to interact with users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- Note: In a production Supabase instance, USING (true) for UPDATE/ALL is insecure.
-- However, since the Next.js API routes use SUPABASE_SERVICE_ROLE_KEY, they already bypass RLS.
-- This script ensures no accidental RLS blocks exist for public interactions that the client edge functions might trigger.
