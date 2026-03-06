// ─── Automation Rule Types ───

export type RuleType =
  | 'pause_high_cpa'
  | 'scale_good_performer'
  | 'pause_no_conversion'
  | 'alert_only';

export interface PauseHighCpaConfig {
  cpa_limit: number;
  min_spend: number;
  lookback_days: number;
}

export interface ScaleGoodPerformerConfig {
  roas_min: number;
  budget_increase_pct: number;
  max_daily_budget: number;
}

export interface PauseNoConversionConfig {
  min_spend: number;
  min_days: number;
}

export interface AlertOnlyConfig {
  metric: string;
  threshold: number;
  direction: 'above' | 'below';
}

export type RuleConfig =
  | PauseHighCpaConfig
  | ScaleGoodPerformerConfig
  | PauseNoConversionConfig
  | AlertOnlyConfig;

export interface AutomationRule {
  id: string;
  client_id: string;
  manager_id: string;
  rule_type: RuleType;
  is_active: boolean;
  config: RuleConfig;
  created_at: string;
  updated_at: string;
}

// ─── Automation Log ───

export type ActionTaken =
  | 'paused_campaign'
  | 'increased_budget'
  | 'alert_sent'
  | 'skipped';

export interface AutomationLog {
  id: string;
  client_id: string;
  rule_id: string;
  action_taken: ActionTaken;
  campaign_name: string | null;
  external_campaign_id: string | null;
  details: Record<string, any>;
  executed_at: string;
}

// ─── WhatsApp Report Config ───

export interface WhatsAppReportConfig {
  id: string;
  client_id: string;
  manager_id: string;
  is_active: boolean;
  send_hour: number;
  phone_number: string;
  last_sent_at: string | null;
  created_at: string;
}

// ─── Rule type labels ───

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  pause_high_cpa: 'Pausar CPA Alto',
  scale_good_performer: 'Escalar Bons Performers',
  pause_no_conversion: 'Pausar Sem Conversão',
  alert_only: 'Apenas Alertar',
};

export const ACTION_LABELS: Record<ActionTaken, string> = {
  paused_campaign: 'Campanha pausada',
  increased_budget: 'Budget aumentado',
  alert_sent: 'Alerta enviado',
  skipped: 'Ação ignorada',
};
