
-- 1. Add client_id to meta_customers
ALTER TABLE public.meta_customers ADD COLUMN IF NOT EXISTS client_id uuid;

-- 2. Add client_id to meta_orders  
ALTER TABLE public.meta_orders ADD COLUMN IF NOT EXISTS client_id uuid;

-- 3. Recreate vw_meta_ltv with client_id
DROP VIEW IF EXISTS public.vw_meta_summary CASCADE;
DROP VIEW IF EXISTS public.vw_meta_campaign_ltv CASCADE;
DROP VIEW IF EXISTS public.vw_meta_cohorts CASCADE;
DROP VIEW IF EXISTS public.vw_meta_ltv CASCADE;

CREATE OR REPLACE VIEW public.vw_meta_ltv
WITH (security_invoker = true)
AS
SELECT
  c.id AS customer_id,
  c.client_id,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(o.amount), 0) AS lifetime_value,
  COALESCE(AVG(o.amount), 0) AS avg_ticket,
  c.email,
  c.name,
  (SELECT o2.utm_campaign FROM public.meta_orders o2 WHERE o2.customer_id = c.id ORDER BY o2.created_at ASC LIMIT 1) AS utm_campaign
FROM public.meta_customers c
LEFT JOIN public.meta_orders o ON o.customer_id = c.id
GROUP BY c.id, c.client_id, c.email, c.name;

-- 4. Recreate vw_meta_campaign_ltv with client_id
CREATE OR REPLACE VIEW public.vw_meta_campaign_ltv
WITH (security_invoker = true)
AS
SELECT
  ltv.client_id,
  ltv.utm_campaign,
  COUNT(*) AS total_customers,
  ROUND(AVG(ltv.lifetime_value), 2) AS avg_ltv,
  SUM(ltv.lifetime_value) AS total_revenue,
  ROUND(AVG(ltv.total_orders), 1) AS avg_orders,
  ROUND(AVG(ltv.avg_ticket), 2) AS avg_ticket
FROM public.vw_meta_ltv ltv
WHERE ltv.utm_campaign IS NOT NULL
GROUP BY ltv.client_id, ltv.utm_campaign;

-- 5. Recreate vw_meta_cohorts with client_id
CREATE OR REPLACE VIEW public.vw_meta_cohorts
WITH (security_invoker = true)
AS
SELECT
  c.client_id,
  TO_CHAR(c.created_at, 'YYYY-MM') AS cohort,
  EXTRACT(MONTH FROM AGE(o.created_at, c.created_at))::int AS months_since,
  COUNT(DISTINCT c.id) AS customers
FROM public.meta_customers c
JOIN public.meta_orders o ON o.customer_id = c.id
GROUP BY c.client_id, TO_CHAR(c.created_at, 'YYYY-MM'), EXTRACT(MONTH FROM AGE(o.created_at, c.created_at))::int;

-- 6. Recreate vw_meta_summary with client_id
CREATE OR REPLACE VIEW public.vw_meta_summary
WITH (security_invoker = true)
AS
SELECT
  c.client_id,
  COUNT(DISTINCT c.id) AS total_leads,
  COALESCE(AVG(ltv.lifetime_value), 0) AS avg_ltv,
  COALESCE(SUM(ltv.lifetime_value), 0) AS total_revenue,
  ROUND(
    COUNT(DISTINCT CASE WHEN ltv.total_orders > 1 THEN c.id END)::numeric
    / NULLIF(COUNT(DISTINCT c.id), 0) * 100, 1
  ) AS repurchase_rate
FROM public.meta_customers c
LEFT JOIN public.vw_meta_ltv ltv ON ltv.customer_id = c.id
GROUP BY c.client_id;

-- 7. Update RLS on meta_customers: managers can see their clients' customers
DROP POLICY IF EXISTS "Authenticated can view meta_customers" ON public.meta_customers;
CREATE POLICY "Managers can view client meta_customers"
ON public.meta_customers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.client_manager_links
    WHERE client_manager_links.client_user_id = meta_customers.client_id
    AND client_manager_links.manager_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
  OR meta_customers.client_id IS NULL
);

-- 8. Update RLS on meta_orders: managers can see their clients' orders
DROP POLICY IF EXISTS "Authenticated can view meta_orders" ON public.meta_orders;
CREATE POLICY "Managers can view client meta_orders"
ON public.meta_orders FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.meta_customers mc
    JOIN public.client_manager_links cml ON cml.client_user_id = mc.client_id
    WHERE mc.id = meta_orders.customer_id
    AND cml.manager_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.meta_customers mc
    WHERE mc.id = meta_orders.customer_id AND mc.client_id IS NULL
  )
);
