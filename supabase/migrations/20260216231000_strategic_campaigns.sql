-- Create strategic_campaigns table
CREATE TABLE IF NOT EXISTS public.strategic_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.client_manager_links(id) ON DELETE CASCADE,
    campaign_name TEXT NOT NULL,
    platform TEXT NOT NULL,
    objective TEXT NOT NULL,
    budget NUMERIC DEFAULT 0,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'IDEIA',
    creatives JSONB DEFAULT '[]'::jsonb,
    copy JSONB DEFAULT '{}'::jsonb,
    strategy JSONB DEFAULT '{}'::jsonb,
    checklist JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    learning TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.strategic_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users (simplified for now, following project pattern)
CREATE POLICY "Enable all for authenticated users" ON public.strategic_campaigns
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_strategic_campaigns_updated_at
    BEFORE UPDATE ON public.strategic_campaigns
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
