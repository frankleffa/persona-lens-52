
-- Tabela de métricas diárias persistidas
CREATE TABLE IF NOT EXISTS public.daily_metrics (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  account_id text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('google', 'meta')),
  date date NOT NULL,
  spend numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  conversions numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  cpa numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índice único para upsert
CREATE UNIQUE INDEX daily_metrics_unique ON public.daily_metrics(account_id, platform, date);

-- Índices para queries frequentes
CREATE INDEX idx_daily_metrics_client_date ON public.daily_metrics(client_id, date);
CREATE INDEX idx_daily_metrics_platform ON public.daily_metrics(platform);

-- Trigger para updated_at
CREATE TRIGGER update_daily_metrics_updated_at
  BEFORE UPDATE ON public.daily_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Habilitar RLS
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;

-- Gestores veem métricas dos seus clientes vinculados
CREATE POLICY "Managers can view client metrics"
  ON public.daily_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_manager_links
      WHERE client_manager_links.client_user_id = daily_metrics.client_id
        AND client_manager_links.manager_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Clientes veem apenas suas próprias métricas
CREATE POLICY "Clients can view own metrics"
  ON public.daily_metrics FOR SELECT
  USING (auth.uid() = client_id);

-- Service role (edge functions) pode inserir/atualizar
CREATE POLICY "Service can upsert metrics"
  ON public.daily_metrics FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
