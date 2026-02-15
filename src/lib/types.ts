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
  | "camp_messages";

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
  { key: "investment", label: "Investimento", module: "Financeiro", description: "Total investido em campanhas" },
  { key: "revenue", label: "Receita", module: "Financeiro", description: "Receita gerada" },
  { key: "roas", label: "ROAS", module: "Financeiro", description: "Retorno sobre investimento publicitário" },
  { key: "leads", label: "Leads", module: "Conversão", description: "Leads gerados" },
  { key: "messages", label: "Mensagens", module: "Conversão", description: "Mensagens de campanhas de mensagem" },
  { key: "cpa", label: "CPA", module: "Conversão", description: "Custo por aquisição" },
  { key: "ctr", label: "CTR", module: "Performance", description: "Taxa de cliques" },
  { key: "cpc", label: "CPC", module: "Performance", description: "Custo por clique" },
  { key: "conversion_rate", label: "Taxa de Conversão", module: "Conversão", description: "Percentual de conversão" },
  { key: "sessions", label: "Sessões", module: "Tráfego", description: "Sessões no site" },
  { key: "events", label: "Eventos", module: "Tráfego", description: "Eventos rastreados" },
  { key: "campaign_names", label: "Campanhas", module: "Campanhas", description: "Nomes das campanhas ativas" },
  { key: "ad_sets", label: "Conjuntos de Anúncios", module: "Campanhas", description: "Conjuntos de anúncios ativos" },
  { key: "attribution_comparison", label: "Comparação de Atribuição", module: "Análise", description: "Comparativo entre modelos de atribuição" },
  { key: "discrepancy_percentage", label: "Discrepância %", module: "Análise", description: "Percentual de discrepância entre plataformas" },
  { key: "trend_charts", label: "Gráficos de Tendência", module: "Visualização", description: "Gráficos de tendência temporal" },
  { key: "funnel_visualization", label: "Funil de Conversão", module: "Visualização", description: "Visualização do funil" },
  { key: "camp_investment", label: "Investimento (Campanha)", module: "Campanhas", description: "Coluna de investimento na tabela de campanhas" },
  { key: "camp_result", label: "Resultado (Campanha)", module: "Campanhas", description: "Coluna de resultado (leads/msgs) na tabela" },
  { key: "camp_cpa", label: "CPA (Campanha)", module: "Campanhas", description: "Coluna de CPA na tabela de campanhas" },
  { key: "camp_clicks", label: "Cliques (Campanha)", module: "Campanhas", description: "Coluna de cliques na tabela de campanhas" },
  { key: "camp_impressions", label: "Impressões (Campanha)", module: "Campanhas", description: "Coluna de impressões na tabela" },
  { key: "camp_ctr", label: "CTR (Campanha)", module: "Campanhas", description: "Coluna de CTR na tabela de campanhas" },
  { key: "camp_revenue", label: "Receita (Campanha)", module: "Campanhas", description: "Coluna de receita na tabela de campanhas" },
  { key: "camp_messages", label: "Mensagens (Campanha)", module: "Campanhas", description: "Coluna de mensagens na tabela" },
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
};
