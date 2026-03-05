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
  | "camp_cpc"
  | "camp_clicks"
  | "camp_impressions"
  | "camp_ctr"
  | "camp_revenue"
  | "camp_messages"
  | "camp_purchases"
  | "camp_registrations"
  // Google Ads platform-specific
  | "google_investment"
  | "google_clicks"
  | "google_impressions"
  | "google_conversions"
  | "google_ctr"
  | "google_cpc"
  | "google_cpa"
  | "google_revenue"
  // Meta Ads platform-specific
  | "meta_investment"
  | "meta_clicks"
  | "meta_impressions"
  | "meta_leads"
  | "meta_ctr"
  | "meta_cpc"
  | "meta_cpa"
  | "meta_revenue"
  | "meta_messages"
  | "meta_conversions"
  | "meta_registrations"
  | "meta_cost_per_purchase"
  | "meta_cost_per_registration"
  // Campaign cost-per metrics
  | "camp_cost_per_purchase"
  | "camp_cost_per_registration"
  | "camp_profile_visits"
  | "camp_followers"
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
  { key: "google_revenue", label: "Receita", module: "Google Ads", description: "Receita no Google Ads" },
  // Meta Ads
  { key: "meta_investment", label: "Investimento", module: "Meta Ads", description: "Investimento no Meta Ads" },
  { key: "meta_clicks", label: "Cliques", module: "Meta Ads", description: "Cliques no Meta Ads" },
  { key: "meta_impressions", label: "Impressões", module: "Meta Ads", description: "Impressões no Meta Ads" },
  { key: "meta_leads", label: "Leads", module: "Meta Ads", description: "Leads no Meta Ads" },
  { key: "meta_ctr", label: "CTR", module: "Meta Ads", description: "Taxa de cliques no Meta Ads" },
  { key: "meta_cpc", label: "CPC", module: "Meta Ads", description: "Custo por clique no Meta Ads" },
  { key: "meta_cpa", label: "CPA", module: "Meta Ads", description: "Custo por aquisição no Meta Ads" },
  { key: "meta_revenue", label: "Receita", module: "Meta Ads", description: "Receita no Meta Ads" },
  { key: "meta_messages", label: "Mensagens", module: "Meta Ads", description: "Mensagens no Meta Ads" },
  { key: "meta_conversions", label: "Compras", module: "Meta Ads", description: "Conversões de compra no Meta Ads" },
  { key: "meta_registrations", label: "Cadastros", module: "Meta Ads", description: "Conversões de cadastro no Meta Ads" },
  { key: "meta_cost_per_purchase", label: "Custo/Compra", module: "Meta Ads", description: "Custo por compra no Meta Ads" },
  { key: "meta_cost_per_registration", label: "Custo/Cadastro", module: "Meta Ads", description: "Custo por cadastro no Meta Ads" },
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
  { key: "camp_cpc", label: "CPC (Campanha)", module: "Campanhas", description: "Coluna de CPC na tabela de campanhas" },
  { key: "camp_clicks", label: "Cliques (Campanha)", module: "Campanhas", description: "Coluna de cliques na tabela de campanhas" },
  { key: "camp_impressions", label: "Impressões (Campanha)", module: "Campanhas", description: "Coluna de impressões na tabela" },
  { key: "camp_ctr", label: "CTR (Campanha)", module: "Campanhas", description: "Coluna de CTR na tabela de campanhas" },
  { key: "camp_revenue", label: "Receita (Campanha)", module: "Campanhas", description: "Coluna de receita na tabela de campanhas" },
  { key: "camp_messages", label: "Mensagens (Campanha)", module: "Campanhas", description: "Coluna de mensagens na tabela" },
  { key: "camp_purchases", label: "Compras (Campanha)", module: "Campanhas", description: "Compras por campanha" },
  { key: "camp_registrations", label: "Cadastros (Campanha)", module: "Campanhas", description: "Cadastros por campanha" },
  { key: "camp_cost_per_purchase", label: "Custo/Compra (Camp.)", module: "Campanhas", description: "Custo por compra por campanha" },
  { key: "camp_cost_per_registration", label: "Custo/Cadastro (Camp.)", module: "Campanhas", description: "Custo por cadastro por campanha" },
  { key: "camp_profile_visits", label: "Visitas ao Perfil (Camp.)", module: "Campanhas", description: "Visitas ao perfil por campanha" },
  { key: "camp_followers", label: "Novos Seguidores (Camp.)", module: "Campanhas", description: "Novos seguidores por campanha" },
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
    metrics: ["google_investment", "google_clicks", "google_impressions", "google_conversions", "google_ctr", "google_cpc", "google_cpa", "google_revenue"] as MetricKey[],
  },
  {
    id: "meta",
    label: "Meta Ads",
    icon: "M",
    colorClass: "text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-950",
    metrics: ["meta_investment", "meta_clicks", "meta_impressions", "meta_leads", "meta_ctr", "meta_cpc", "meta_cpa", "meta_revenue", "meta_messages", "meta_conversions", "meta_registrations", "meta_cost_per_purchase", "meta_cost_per_registration"] as MetricKey[],
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
    metrics: ["campaign_names", "ad_sets", "camp_investment", "camp_result", "camp_cpa", "camp_cpc", "camp_clicks", "camp_impressions", "camp_ctr", "camp_revenue", "camp_messages", "camp_purchases", "camp_registrations", "camp_cost_per_purchase", "camp_cost_per_registration", "camp_profile_visits", "camp_followers"] as MetricKey[],
  },
  {
    id: "visualization",
    label: "Visualização",
    icon: "📈",
    colorClass: "text-rose-600 bg-rose-100 dark:text-rose-400 dark:bg-rose-950",
    metrics: ["attribution_comparison", "discrepancy_percentage", "trend_charts", "funnel_visualization"] as MetricKey[],
  },
];
