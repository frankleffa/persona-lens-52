
-- Add is_demo column to client_manager_links
ALTER TABLE public.client_manager_links
ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

-- Create two fixed demo client UUIDs
-- Digital Academy Pro: 00000000-0000-0000-0000-000000000001
-- Urban Fit Store:     00000000-0000-0000-0000-000000000002

-- Insert demo data into daily_metrics (90 days)
-- INFOPRODUTO: Google Ads, spend ~1200, CPC ~2.20, CTR 1.8-2.3%, 20-30 conv/day, ticket 497, ROAS 2.4-3.2
INSERT INTO public.daily_metrics (client_id, account_id, platform, date, spend, impressions, clicks, conversions, revenue, ctr, cpc, cpm, cpa, roas)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  'DEMO-GOOGLE-001',
  'google',
  d::date,
  -- spend: ~1200 ±100 with slight upward trend
  round((1200 + (random() * 200 - 100) + (90 - (current_date - d::date)) * 1.5)::numeric, 2) AS spend,
  -- impressions derived from spend/cpm (~15 CPM)
  round(((1200 + (random() * 200 - 100) + (90 - (current_date - d::date)) * 1.5) / 15 * 1000)::numeric) AS impressions,
  -- clicks from impressions * CTR (1.8-2.3%)
  round((((1200 + (random() * 200 - 100)) / 15 * 1000) * (0.018 + random() * 0.005))::numeric) AS clicks,
  -- conversions: 20-30/day with trend
  round((20 + random() * 10 + (90 - (current_date - d::date)) * 0.08)::numeric) AS conversions,
  -- revenue: conversions * ticket (~497)
  round(((20 + random() * 10 + (90 - (current_date - d::date)) * 0.08) * (497 + random() * 60 - 30))::numeric, 2) AS revenue,
  0, 0, 0, 0, 0 -- will be recalculated below
FROM generate_series(current_date - 89, current_date, '1 day'::interval) AS d;

-- E-COMMERCE: Meta Ads, spend ~2500, CPC ~1.40, CTR 2.3-2.9%, 70-90 conv/day, ticket 189, ROAS 1.8-2.5
INSERT INTO public.daily_metrics (client_id, account_id, platform, date, spend, impressions, clicks, conversions, revenue, ctr, cpc, cpm, cpa, roas)
SELECT
  '00000000-0000-0000-0000-000000000002'::uuid,
  'DEMO-META-001',
  'meta',
  d::date,
  round((2500 + (random() * 400 - 200) + (90 - (current_date - d::date)) * 2.0)::numeric, 2) AS spend,
  round(((2500 + (random() * 400 - 200)) / 12 * 1000)::numeric) AS impressions,
  round((((2500 + (random() * 400 - 200)) / 12 * 1000) * (0.023 + random() * 0.006))::numeric) AS clicks,
  round((70 + random() * 20 + (90 - (current_date - d::date)) * 0.15)::numeric) AS conversions,
  round(((70 + random() * 20 + (90 - (current_date - d::date)) * 0.15) * (189 + random() * 40 - 20))::numeric, 2) AS revenue,
  0, 0, 0, 0, 0
FROM generate_series(current_date - 89, current_date, '1 day'::interval) AS d;

-- Now recalculate derived metrics for all demo rows
UPDATE public.daily_metrics SET
  ctr = CASE WHEN impressions > 0 THEN round((clicks::numeric / impressions * 100), 2) ELSE 0 END,
  cpc = CASE WHEN clicks > 0 THEN round((spend / clicks), 2) ELSE 0 END,
  cpm = CASE WHEN impressions > 0 THEN round((spend / impressions * 1000), 2) ELSE 0 END,
  cpa = CASE WHEN conversions > 0 THEN round((spend / conversions), 2) ELSE 0 END,
  roas = CASE WHEN spend > 0 THEN round((revenue / spend), 2) ELSE 0 END
WHERE account_id IN ('DEMO-GOOGLE-001', 'DEMO-META-001');
