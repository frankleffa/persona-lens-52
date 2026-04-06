
DROP POLICY "Service role full access pending connections" ON public.whatsapp_pending_connections;

CREATE POLICY "Users can manage own pending connections"
  ON public.whatsapp_pending_connections FOR ALL
  USING (agency_id = auth.uid())
  WITH CHECK (agency_id = auth.uid());
