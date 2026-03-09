
INSERT INTO storage.buckets (id, name, public) VALUES ('campaign-creatives', 'campaign-creatives', true);

CREATE POLICY "Managers can upload creatives" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'campaign-creatives' AND auth.uid() IS NOT NULL);

CREATE POLICY "Managers can delete creatives" ON storage.objects FOR DELETE
  USING (bucket_id = 'campaign-creatives' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read creatives" ON storage.objects FOR SELECT
  USING (bucket_id = 'campaign-creatives');
