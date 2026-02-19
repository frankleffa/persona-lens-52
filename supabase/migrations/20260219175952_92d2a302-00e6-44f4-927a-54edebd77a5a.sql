
-- Add external_campaign_id column
ALTER TABLE daily_campaigns ADD COLUMN IF NOT EXISTS external_campaign_id text;

-- Create unique index for external_campaign_id (partial, only when not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_campaigns_external_id 
ON daily_campaigns (client_id, account_id, platform, date, external_campaign_id) 
WHERE external_campaign_id IS NOT NULL;

-- Clean up duplicates: keep only the most recent row per (client_id, account_id, platform, date, campaign_name)
DELETE FROM daily_campaigns a
USING daily_campaigns b
WHERE a.client_id = b.client_id
  AND a.account_id = b.account_id
  AND a.platform = b.platform
  AND a.date = b.date
  AND a.campaign_name = b.campaign_name
  AND a.created_at < b.created_at;
