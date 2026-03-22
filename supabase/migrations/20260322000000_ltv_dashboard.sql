-- =============================================================
-- LTV Dashboard — Meta Ads
-- Creates tables for customer/order tracking with UTM data
-- and views for LTV analytics
-- =============================================================

-- Table: meta_customers (leads/clientes adquiridos)
CREATE TABLE IF NOT EXISTS meta_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: meta_orders (pedidos/compras)
CREATE TABLE IF NOT EXISTS meta_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES meta_customers(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  fbclid TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meta_orders_customer ON meta_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_meta_orders_utm_source ON meta_orders(utm_source);
CREATE INDEX IF NOT EXISTS idx_meta_orders_fbclid ON meta_orders(fbclid);
CREATE INDEX IF NOT EXISTS idx_meta_orders_created_at ON meta_orders(created_at);

-- =============================================================
-- View 1: LTV por cliente (Meta Ads)
-- =============================================================
CREATE OR REPLACE VIEW vw_meta_ltv AS
SELECT
    c.id AS customer_id,
    c.email,
    c.name,
    MIN(o.created_at) AS first_purchase,
    MAX(o.created_at) AS last_purchase,
    COUNT(o.id) AS total_orders,
    SUM(o.amount)::numeric(12,2) AS lifetime_value,
    ROUND(SUM(o.amount) / NULLIF(COUNT(o.id), 0), 2) AS avg_ticket,
    o.utm_source,
    o.utm_campaign,
    o.utm_content
FROM meta_customers c
JOIN meta_orders o ON c.id = o.customer_id
WHERE (
    LOWER(o.utm_source) IN ('facebook', 'meta', 'ig', 'instagram', 'fb')
    OR o.fbclid IS NOT NULL
)
AND o.amount > 0
GROUP BY c.id, c.email, c.name, o.utm_source, o.utm_campaign, o.utm_content;

-- =============================================================
-- View 2: Resumo por campanha
-- =============================================================
CREATE OR REPLACE VIEW vw_meta_campaign_ltv AS
SELECT
    utm_campaign,
    COUNT(DISTINCT customer_id) AS total_customers,
    ROUND(AVG(lifetime_value)::numeric, 2) AS avg_ltv,
    ROUND(SUM(lifetime_value)::numeric, 2) AS total_revenue,
    ROUND(AVG(total_orders)::numeric, 1) AS avg_orders,
    ROUND(AVG(avg_ticket)::numeric, 2) AS avg_ticket
FROM vw_meta_ltv
WHERE utm_campaign IS NOT NULL
GROUP BY utm_campaign
ORDER BY avg_ltv DESC;

-- =============================================================
-- View 3: Cohort de recompra
-- =============================================================
CREATE OR REPLACE VIEW vw_meta_cohorts AS
SELECT
    TO_CHAR(first_purchase, 'YYYY-MM') AS cohort,
    months_since,
    COUNT(DISTINCT customer_id) AS customers
FROM (
    SELECT
        o.customer_id,
        o.created_at,
        MIN(o.created_at) OVER (PARTITION BY o.customer_id) AS first_purchase,
        EXTRACT(MONTH FROM AGE(
            o.created_at,
            MIN(o.created_at) OVER (PARTITION BY o.customer_id)
        ))::int AS months_since
    FROM meta_orders o
    WHERE (
        LOWER(o.utm_source) IN ('facebook', 'meta', 'ig', 'instagram', 'fb')
        OR o.fbclid IS NOT NULL
    )
    AND o.amount > 0
) sub
GROUP BY cohort, months_since
ORDER BY cohort, months_since;

-- =============================================================
-- View 4: Métricas resumo (cards do topo)
-- =============================================================
CREATE OR REPLACE VIEW vw_meta_summary AS
SELECT
    COUNT(DISTINCT customer_id) AS total_leads,
    ROUND(AVG(lifetime_value)::numeric, 2) AS avg_ltv,
    ROUND(SUM(lifetime_value)::numeric, 2) AS total_revenue,
    ROUND(
        COUNT(DISTINCT CASE WHEN total_orders >= 2 THEN customer_id END)::numeric /
        NULLIF(COUNT(DISTINCT customer_id), 0) * 100
    , 1) AS repurchase_rate
FROM vw_meta_ltv;

-- =============================================================
-- RLS & Grants
-- =============================================================
ALTER TABLE meta_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_orders ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Authenticated users can read meta_customers"
  ON meta_customers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read meta_orders"
  ON meta_orders FOR SELECT TO authenticated USING (true);

-- Grant select on views to authenticated role
GRANT SELECT ON vw_meta_ltv TO authenticated;
GRANT SELECT ON vw_meta_campaign_ltv TO authenticated;
GRANT SELECT ON vw_meta_cohorts TO authenticated;
GRANT SELECT ON vw_meta_summary TO authenticated;
