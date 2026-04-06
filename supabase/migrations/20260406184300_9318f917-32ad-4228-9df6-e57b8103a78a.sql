DROP POLICY IF EXISTS "Service role can manage leads" ON public.leads;
CREATE POLICY "Service role can manage leads" ON public.leads FOR ALL TO service_role USING (true) WITH CHECK (true);