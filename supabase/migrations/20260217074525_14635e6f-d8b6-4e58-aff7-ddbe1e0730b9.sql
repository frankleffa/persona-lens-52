
-- Add Stripe columns to plans
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_id text;

-- Add Stripe columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Update Solo plan with Stripe IDs
UPDATE public.plans
SET stripe_product_id = 'prod_TziO09F8o847ao',
    stripe_price_id = 'price_1T1ixPHWjAHcBQNvIzTNjc0b'
WHERE name = 'Solo' AND is_active = true;

-- Update Growth plan with Stripe IDs
UPDATE public.plans
SET stripe_product_id = 'prod_TziOC7Sa5zER1X',
    stripe_price_id = 'price_1T1ixdHWjAHcBQNv4qUqASKe'
WHERE name = 'Growth' AND is_active = true;

-- Remove Hotmart columns from plans
ALTER TABLE public.plans
  DROP COLUMN IF EXISTS hotmart_product_id,
  DROP COLUMN IF EXISTS hotmart_offer_id;

-- Remove Hotmart columns from subscriptions
ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS hotmart_product_id,
  DROP COLUMN IF EXISTS hotmart_subscription_id,
  DROP COLUMN IF EXISTS hotmart_transaction_id;

-- Drop hotmart_webhook_logs table
DROP TABLE IF EXISTS public.hotmart_webhook_logs;
