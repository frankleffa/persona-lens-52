export type MetricKey =
  | "investment"
  | "revenue"
  | "roas"
  | "leads"
  | "messages"
  | "cpa"
  | "ctr"
  | "cpc"
  | "conversion_rate"
  | "sessions"
  | "events"
  | "campaign_names"
  | "ad_sets"
  | "attribution_comparison"
  | "discrepancy_percentage"
  | "trend_charts"
  | "funnel_visualization"
  | "camp_investment"
  | "camp_result"
  | "camp_cpa"
  | "camp_clicks"
  | "camp_impressions"
  | "camp_ctr"
  | "camp_revenue"
  | "camp_messages"
  // Google Ads platform-specific
  | "google_investment"
  | "google_clicks"
  | "google_impressions"
  | "google_conversions"
  | "google_ctr"
  | "google_cpc"
  | "google_cpa"
  // Meta Ads platform-specific
  | "meta_investment"
  | "meta_clicks"
  | "meta_impressions"
  | "meta_leads"
  | "meta_ctr"
  | "meta_cpc"
  | "meta_cpa"
  // GA4 platform-specific
  | "ga4_sessions"
  | "ga4_events"
  | "ga4_conversion_rate";

export interface MetricDefinition {
  key: MetricKey;
  label: string;
  module: string;
  description: string;
}

export interface ClientMetricPermission {
  id: string;
  clientId: string;
  metricKey: MetricKey;
  isVisible: boolean;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  avatarInitials: string;
}

export interface MetricData {
  key: MetricKey;
  value: string;
  change: number;
  trend: "up" | "down" | "neutral";
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  // Consolidado
  { key: "investment", label: "Investimento", module: "Consolidado", description: "Total investido em campanhas" },
  { key: "revenue", label: "Receita", module: "Consolidado", description: "Receita gerada" },
  { key: "roas", label: "ROAS", module: "Consolidado", description: "Retorno sobre investimento publicitário" },
  { key: "leads", label: "Leads", module: "Consolidado", description: "Leads gerados" },
  { key: "messages", label: "Mensagens", module: "Consolidado", description: "Mensagens de campanhas de mensagem" },
  { key: "cpa", label: "CPA", module: "Consolidado", description: "Custo por aquisição" },
  // Google Ads
  { key: "google_investment", label: "Investimento", module: "Google Ads", description: "Investimento no Google Ads" },
  { key: "google_clicks", label: "Cliques", module: "Google Ads", description: "Cliques no Google Ads" },
  { key: "google_impressions", label: "Impressões", module: "Google Ads", description: "Impressões no Google Ads" },
  { key: "google_conversions", label: "Conversões", module: "Google Ads", description: "Conversões no Google Ads" },
  { key: "google_ctr", label: "CTR", module: "Google Ads", description: "Taxa de cliques no Google Ads" },
  { key: "google_cpc", label: "CPC", module: "Google Ads", description: "Custo por clique no Google Ads" },
  { key: "google_cpa", label: "CPA", module: "Google Ads", description: "Custo por aquisição no Google Ads" },
  // Meta Ads
  { key: "meta_investment", label: "Investimento", module: "Meta Ads", description: "Investimento no Meta Ads" },
  { key: "meta_clicks", label: "Cliques", module: "Meta Ads", description: "Cliques no Meta Ads" },
  { key: "meta_impressions", label: "Impressões", module: "Meta Ads", description: "Impressões no Meta Ads" },
  { key: "meta_leads", label: "Leads", module: "Meta Ads", description: "Leads no Meta Ads" },
  { key: "meta_ctr", label: "CTR", module: "Meta Ads", description: "Taxa de cliques no Meta Ads" },
  { key: "meta_cpc", label: "CPC", module: "Meta Ads", description: "Custo por clique no Meta Ads" },
  { key: "meta_cpa", label: "CPA", module: "Meta Ads", description: "Custo por aquisição no Meta Ads" },
  // GA4
  { key: "ga4_sessions", label: "Sessões", module: "GA4", description: "Sessões no GA4" },
  { key: "ga4_events", label: "Eventos", module: "GA4", description: "Eventos rastreados no GA4" },
  { key: "ga4_conversion_rate", label: "Taxa de Conversão", module: "GA4", description: "Taxa de conversão no GA4" },
  // Campanhas
  { key: "campaign_names", label: "Campanhas", module: "Campanhas", description: "Nomes das campanhas ativas" },
  { key: "ad_sets", label: "Conjuntos de Anúncios", module: "Campanhas", description: "Conjuntos de anúncios ativos" },
  { key: "camp_investment", label: "Investimento (Campanha)", module: "Campanhas", description: "Coluna de investimento na tabela de campanhas" },
  { key: "camp_result", label: "Resultado (Campanha)", module: "Campanhas", description: "Coluna de resultado (leads/msgs) na tabela" },
  { key: "camp_cpa", label: "CPA (Campanha)", module: "Campanhas", description: "Coluna de CPA na tabela de campanhas" },
  { key: "camp_clicks", label: "Cliques (Campanha)", module: "Campanhas", description: "Coluna de cliques na tabela de campanhas" },
  { key: "camp_impressions", label: "Impressões (Campanha)", module: "Campanhas", description: "Coluna de impressões na tabela" },
  { key: "camp_ctr", label: "CTR (Campanha)", module: "Campanhas", description: "Coluna de CTR na tabela de campanhas" },
  { key: "camp_revenue", label: "Receita (Campanha)", module: "Campanhas", description: "Coluna de receita na tabela de campanhas" },
  { key: "camp_messages", label: "Mensagens (Campanha)", module: "Campanhas", description: "Coluna de mensagens na tabela" },
  // Visualização
  { key: "attribution_comparison", label: "Comparação de Atribuição", module: "Visualização", description: "Comparativo entre modelos de atribuição" },
  { key: "discrepancy_percentage", label: "Discrepância %", module: "Visualização", description: "Percentual de discrepância entre plataformas" },
  { key: "trend_charts", label: "Gráficos de Tendência", module: "Visualização", description: "Gráficos de tendência temporal" },
  { key: "funnel_visualization", label: "Funil de Conversão", module: "Visualização", description: "Visualização do funil" },
  // Legacy shared keys (kept for backward compat)
  { key: "ctr", label: "CTR (Legado)", module: "Legado", description: "Taxa de cliques (legado)" },
  { key: "cpc", label: "CPC (Legado)", module: "Legado", description: "Custo por clique (legado)" },
  { key: "conversion_rate", label: "Taxa de Conversão (Legado)", module: "Legado", description: "Percentual de conversão (legado)" },
  { key: "sessions", label: "Sessões (Legado)", module: "Legado", description: "Sessões no site (legado)" },
  { key: "events", label: "Eventos (Legado)", module: "Legado", description: "Eventos rastreados (legado)" },
];

export const MOCK_CLIENTS: Client[] = [
  { id: "c1", name: "Ricardo Almeida", company: "TechBrasil", avatarInitials: "RA" },
  { id: "c2", name: "Fernanda Costa", company: "ModaViva", avatarInitials: "FC" },
  { id: "c3", name: "Carlos Mendes", company: "AutoPrime", avatarInitials: "CM" },
];

export const MOCK_METRIC_DATA: Record<MetricKey, MetricData> = {
  investment: { key: "investment", value: "R$ 48.250", change: 12.5, trend: "up" },
  revenue: { key: "revenue", value: "R$ 186.430", change: 23.1, trend: "up" },
  roas: { key: "roas", value: "3.86x", change: 8.4, trend: "up" },
  leads: { key: "leads", value: "1.247", change: 15.2, trend: "up" },
  messages: { key: "messages", value: "0", change: 0, trend: "neutral" },
  cpa: { key: "cpa", value: "R$ 38,70", change: -5.3, trend: "down" },
  ctr: { key: "ctr", value: "4.82%", change: 2.1, trend: "up" },
  cpc: { key: "cpc", value: "R$ 1,24", change: -3.8, trend: "down" },
  conversion_rate: { key: "conversion_rate", value: "6.4%", change: 1.9, trend: "up" },
  sessions: { key: "sessions", value: "34.521", change: 18.7, trend: "up" },
  events: { key: "events", value: "12.843", change: 9.2, trend: "up" },
  campaign_names: { key: "campaign_names", value: "8 ativas", change: 0, trend: "neutral" },
  ad_sets: { key: "ad_sets", value: "24 ativos", change: 0, trend: "neutral" },
  attribution_comparison: { key: "attribution_comparison", value: "Multi-touch", change: 0, trend: "neutral" },
  discrepancy_percentage: { key: "discrepancy_percentage", value: "4.2%", change: -1.1, trend: "down" },
  trend_charts: { key: "trend_charts", value: "30 dias", change: 0, trend: "neutral" },
  funnel_visualization: { key: "funnel_visualization", value: "5 etapas", change: 0, trend: "neutral" },
  camp_investment: { key: "camp_investment", value: "—", change: 0, trend: "neutral" },
  camp_result: { key: "camp_result", value: "—", change: 0, trend: "neutral" },
  camp_cpa: { key: "camp_cpa", value: "—", change: 0, trend: "neutral" },
  camp_clicks: { key: "camp_clicks", value: "—", change: 0, trend: "neutral" },
  camp_impressions: { key: "camp_impressions", value: "—", change: 0, trend: "neutral" },
  camp_ctr: { key: "camp_ctr", value: "—", change: 0, trend: "neutral" },
  camp_revenue: { key: "camp_revenue", value: "—", change: 0, trend: "neutral" },
  camp_messages: { key: "camp_messages", value: "—", change: 0, trend: "neutral" },
  // Google Ads
  google_investment: { key: "google_investment", value: "—", change: 0, trend: "neutral" },
  google_clicks: { key: "google_clicks", value: "—", change: 0, trend: "neutral" },
  google_impressions: { key: "google_impressions", value: "—", change: 0, trend: "neutral" },
  google_conversions: { key: "google_conversions", value: "—", change: 0, trend: "neutral" },
  google_ctr: { key: "google_ctr", value: "—", change: 0, trend: "neutral" },
  google_cpc: { key: "google_cpc", value: "—", change: 0, trend: "neutral" },
  google_cpa: { key: "google_cpa", value: "—", change: 0, trend: "neutral" },
  // Meta Ads
  meta_investment: { key: "meta_investment", value: "—", change: 0, trend: "neutral" },
  meta_clicks: { key: "meta_clicks", value: "—", change: 0, trend: "neutral" },
  meta_impressions: { key: "meta_impressions", value: "—", change: 0, trend: "neutral" },
  meta_leads: { key: "meta_leads", value: "—", change: 0, trend: "neutral" },
  meta_ctr: { key: "meta_ctr", value: "—", change: 0, trend: "neutral" },
  meta_cpc: { key: "meta_cpc", value: "—", change: 0, trend: "neutral" },
  meta_cpa: { key: "meta_cpa", value: "—", change: 0, trend: "neutral" },
  // GA4
  ga4_sessions: { key: "ga4_sessions", value: "—", change: 0, trend: "neutral" },
  ga4_events: { key: "ga4_events", value: "—", change: 0, trend: "neutral" },
  ga4_conversion_rate: { key: "ga4_conversion_rate", value: "—", change: 0, trend: "neutral" },
};

// Platform grouping for permissions UI
export const PLATFORM_GROUPS = [
  {
    id: "consolidated",
    label: "Consolidado",
    icon: "Σ",
    colorClass: "text-muted-foreground bg-muted",
    metrics: ["investment", "revenue", "roas", "leads", "messages", "cpa"] as MetricKey[],
  },
  {
    id: "google",
    label: "Google Ads",
    icon: "G",
    colorClass: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950",
    metrics: ["google_investment", "google_clicks", "google_impressions", "google_conversions", "google_ctr", "google_cpc", "google_cpa"] as MetricKey[],
  },
  {
    id: "meta",
    label: "Meta Ads",
    icon: "M",
    colorClass: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-950",
    metrics: ["meta_investment", "meta_clicks", "meta_impressions", "meta_leads", "meta_ctr", "meta_cpc", "meta_cpa"] as MetricKey[],
  },
  {
    id: "ga4",
    label: "GA4",
    icon: "A",
    colorClass: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950",
    metrics: ["ga4_sessions", "ga4_events", "ga4_conversion_rate"] as MetricKey[],
  },
  {
    id: "campaigns",
    label: "Campanhas",
    icon: "📊",
    colorClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
    metrics: ["campaign_names", "ad_sets", "camp_investment", "camp_result", "camp_cpa", "camp_clicks", "camp_impressions", "camp_ctr", "camp_revenue", "camp_messages"] as MetricKey[],
  },
  {
    id: "visualization",
    label: "Visualização",
    icon: "📈",
    colorClass: "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950",
    metrics: ["attribution_comparison", "discrepancy_percentage", "trend_charts", "funnel_visualization"] as MetricKey[],
  },
];
