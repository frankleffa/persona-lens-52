CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    ltv_total DECIMAL DEFAULT 0,
    data_cadastro TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitando RLS (Row Level Security) por padrão, boa prática no Supabase
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Política de segurança básica permitindo acesso autenticado (pode ser ajustada futuramente)
CREATE POLICY "Enable read access for authenticated users" 
ON public.leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert access for authenticated users" 
ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
