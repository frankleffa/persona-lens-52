CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    ltv_total DECIMAL DEFAULT 0,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for authenticated users" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage leads" ON public.leads FOR ALL USING (true) WITH CHECK (true);