
-- Tabela de clientes Meta
CREATE TABLE IF NOT EXISTS public.meta_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meta_customers ADD CONSTRAINT meta_customers_email_key UNIQUE (email);

-- Tabela de pedidos Meta
CREATE TABLE IF NOT EXISTS public.meta_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.meta_customers(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  fbclid text
);

-- RLS
ALTER TABLE public.meta_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_orders ENABLE ROW LEVEL SECURITY;

-- Policies (leitura para autenticados)
CREATE POLICY "Authenticated can view meta_customers" ON public.meta_customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can view meta_orders" ON public.meta_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can manage meta_customers" ON public.meta_customers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Service can manage meta_orders" ON public.meta_orders FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- View: LTV por cliente
CREATE OR REPLACE VIEW public.vw_meta_ltv AS
SELECT
  c.id AS customer_id,
  c.email,
  c.name,
  COUNT(o.id) AS total_orders,
  COALESCE(SUM(o.amount), 0) AS lifetime_value,
  COALESCE(AVG(o.amount), 0) AS avg_ticket,
  (SELECT o2.utm_campaign FROM public.meta_orders o2 WHERE o2.customer_id = c.id ORDER BY o2.created_at ASC LIMIT 1) AS utm_campaign
FROM public.meta_customers c
LEFT JOIN public.meta_orders o ON o.customer_id = c.id
GROUP BY c.id, c.email, c.name;

-- View: LTV por campanha
CREATE OR REPLACE VIEW public.vw_meta_campaign_ltv AS
SELECT
  COALESCE(first_camp.utm_campaign, 'sem-campanha') AS utm_campaign,
  COUNT(DISTINCT first_camp.customer_id) AS total_customers,
  COALESCE(AVG(ltv.lifetime_value), 0) AS avg_ltv,
  COALESCE(SUM(ltv.lifetime_value), 0) AS total_revenue,
  COALESCE(AVG(ltv.total_orders), 0) AS avg_orders,
  COALESCE(AVG(ltv.avg_ticket), 0) AS avg_ticket
FROM (
  SELECT DISTINCT ON (customer_id) customer_id, utm_campaign
  FROM public.meta_orders
  ORDER BY customer_id, created_at ASC
) first_camp
JOIN public.vw_meta_ltv ltv ON ltv.customer_id = first_camp.customer_id
GROUP BY first_camp.utm_campaign;

-- View: Cohorts de recompra
CREATE OR REPLACE VIEW public.vw_meta_cohorts AS
SELECT
  to_char(first_order.first_date, 'YYYY-MM') AS cohort,
  EXTRACT(MONTH FROM AGE(o.created_at, first_order.first_date))::int AS months_since,
  COUNT(DISTINCT o.customer_id) AS customers
FROM public.meta_orders o
JOIN (
  SELECT customer_id, MIN(created_at) AS first_date
  FROM public.meta_orders
  GROUP BY customer_id
) first_order ON first_order.customer_id = o.customer_id
GROUP BY cohort, months_since;

-- View: Summary
CREATE OR REPLACE VIEW public.vw_meta_summary AS
SELECT
  COUNT(DISTINCT c.id) AS total_leads,
  COALESCE(AVG(ltv.lifetime_value), 0) AS avg_ltv,
  COALESCE(SUM(ltv.lifetime_value), 0) AS total_revenue,
  ROUND(
    COUNT(DISTINCT CASE WHEN ltv.total_orders > 1 THEN c.id END)::numeric /
    NULLIF(COUNT(DISTINCT c.id), 0) * 100, 1
  ) AS repurchase_rate
FROM public.meta_customers c
LEFT JOIN public.vw_meta_ltv ltv ON ltv.customer_id = c.id;
