// Deep Analysis types — matches analysis_reports table and Claude response schema

export type AnalysisTrend = "melhorando" | "estavel" | "piorando";

export type AnalysisScore = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type OptimizationPriority = "alta" | "media" | "baixa";

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
  score: AnalysisScore;
  resumo: string;
  tendencia: AnalysisTrend;
  previsao: string;
  alertas_criticos: AIAlert[];
  oportunidades: AIOpportunity[];
  otimizacoes: AIOptimization[];
  dados_periodo: PeriodSnapshot | null;
  modelo_ia: string;
  created_at: string;
}

export interface PeriodSnapshot {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  variations: PeriodVariations;
  anomalies: Anomaly[];
  declining_campaigns: DecliningCampaign[];
}

export interface PeriodMetrics {
  spend: number;
  ftd: number;
  cost_per_ftd: number;
  roas: number;
  ctr: number;
  cpc: number;
  impressions: number;
  clicks: number;
  revenue: number;
  purchases: number;
  registrations: number;
  messages: number;
  leads: number;
}

export interface PeriodVariations {
  spend: number;
  ftd: number;
  cost_per_ftd: number;
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
  value: number;
  average: number;
  deviation_pct: number;
  type: "spike" | "drop";
}

export interface DecliningCampaign {
  campaign_name: string;
  metric: string;
  consecutive_days: number;
  values: number[];
}

export interface CampaignPerformance {
  campaign_name: string;
  spend: number;
  ftd: number;
  cost_per_ftd: number;
  roas: number;
  ctr: number;
  trend_7d: "up" | "down" | "stable";
  pct_of_total_spend: number;
}

// Claude API response (before DB save)
export interface ClaudeAnalysisResponse {
  score: number;
  resumo: string;
  alertas_criticos: AIAlert[];
  oportunidades: AIOpportunity[];
  otimizacoes: AIOptimization[];
  tendencia_7d: AnalysisTrend;
  previsao: string;
}
