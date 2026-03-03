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

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read logic" ON public.feedbacks FOR SELECT USING (true);
CREATE POLICY "Allow public insert feedbacks" ON public.feedbacks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin update feedbacks" ON public.feedbacks FOR UPDATE USING (auth.uid() IN (SELECT id FROM auth.users WHERE role = 'service_role' OR email = 'admin@gmail.com'));
