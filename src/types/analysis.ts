// ─── Client Verticals & Config ───

export type ClientVertical =
  | 'ecommerce'
  | 'igaming'
  | 'saas'
  | 'infoproduto'
  | 'servicos'
  | 'app'
  | 'leadgen'
  | 'outro';

export type PrimaryMetric =
  | 'purchases'
  | 'ftd'
  | 'leads'
  | 'registrations'
  | 'messages'
  | 'revenue';

export interface ClientAnalysisConfig {
  id: string;
  client_id: string;
  vertical: ClientVertical;
  primary_metric: PrimaryMetric;
  primary_metric_label: string;
  cpa_target: number | null;
  roas_target: number | null;
  monthly_budget: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const VERTICAL_METRICS: Record<
  ClientVertical,
  { metrics: PrimaryMetric[]; default_metric: PrimaryMetric; default_label: string }
> = {
  ecommerce: { metrics: ['purchases', 'revenue'], default_metric: 'purchases', default_label: 'Compras' },
  igaming: { metrics: ['ftd', 'registrations'], default_metric: 'ftd', default_label: 'FTDs' },
  saas: { metrics: ['registrations', 'leads'], default_metric: 'registrations', default_label: 'Registros' },
  infoproduto: { metrics: ['purchases', 'leads'], default_metric: 'purchases', default_label: 'Vendas' },
  servicos: { metrics: ['leads', 'messages'], default_metric: 'leads', default_label: 'Leads' },
  app: { metrics: ['registrations'], default_metric: 'registrations', default_label: 'Instalações' },
  leadgen: { metrics: ['leads', 'messages'], default_metric: 'leads', default_label: 'Leads' },
  outro: {
    metrics: ['purchases', 'ftd', 'leads', 'registrations', 'messages', 'revenue'],
    default_metric: 'purchases',
    default_label: 'Conversões',
  },
};

export const VERTICAL_LABELS: Record<ClientVertical, string> = {
  ecommerce: 'E-commerce',
  igaming: 'iGaming / Betting',
  saas: 'SaaS',
  infoproduto: 'Infoproduto / Curso',
  servicos: 'Serviços Local',
  app: 'App / Download',
  leadgen: 'Geração de Leads',
  outro: 'Outro',
};

// ─── Analysis Results ───

export type AnalysisTrend = 'melhorando' | 'estavel' | 'piorando';

export type OptimizationPriority = 'alta' | 'media' | 'baixa';

export interface AIAlert {
  titulo: string;
  descricao: string;
  acao: string;
  impacto_estimado: string;
  campanha: string | null;
}

export interface AIOpportunity {
  titulo: string;
  descricao: string;
  acao: string;
  potencial: string;
  campanha: string | null;
}

export interface AIOptimization {
  titulo: string;
  descricao: string;
  acao: string;
  prioridade: OptimizationPriority;
  campanha: string | null;
}

export interface AnalysisReport {
  id: string;
  client_id: string;
  score: number;
  resumo: string;
  tendencia: AnalysisTrend;
  previsao: string;
  alertas_criticos: AIAlert[];
  oportunidades: AIOpportunity[];
  otimizacoes: AIOptimization[];
  dados_periodo: Record<string, any>;
  modelo_ia: string;
  vertical_usado: ClientVertical;
  metrica_primaria_usada: string;
  created_at: string;
}

// ─── Internal computation types ───

export interface PeriodMetrics {
  spend: number;
  primary_metric_total: number;
  cost_per_primary: number;
  roas: number;
  ctr: number;
  cpc: number;
  cpm: number;
  impressions: number;
  clicks: number;
  revenue: number;
  purchases: number;
  ftd: number;
  registrations: number;
  messages: number;
  leads: number;
}

export interface PeriodVariations {
  spend: number;
  primary_metric: number;
  cost_per_primary: number;
  roas: number;
  ctr: number;
  cpc: number;
  impressions: number;
  clicks: number;
  revenue: number;
}

export interface Anomaly {
  campaign_name: string;
  metric: string;
  description: string;
  value: number;
  average: number;
  std_dev: number;
  deviation_factor: number;
  type: 'pico_spend' | 'queda_conversoes' | 'cpa_disparou' | 'ctr_caiu' | 'roas_negativo';
}

export interface DecliningCampaign {
  campaign_name: string;
  metric: string;
  description: string;
  consecutive_days: number;
  values: number[];
}

export interface CampaignPerformance {
  campaign_name: string;
  spend: number;
  primary_metric_value: number;
  cost_per_primary: number;
  roas: number;
  ctr: number;
  clicks: number;
  trend_3d: 'melhorando' | 'estavel' | 'piorando';
  pct_of_total_spend: number;
}

export interface ClaudeAnalysisResponse {
  score: number;
  resumo: string;
  alertas_criticos: AIAlert[];
  oportunidades: AIOpportunity[];
  otimizacoes: AIOptimization[];
  tendencia_7d: AnalysisTrend;
  previsao: string;
}
