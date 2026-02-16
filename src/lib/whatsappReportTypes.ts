export type WhatsAppReportMetrics = {
  investment: boolean;
  revenue: boolean;
  roas: boolean;
  cpa: boolean;
  cpc: boolean;
  cpm: boolean;
  clicks: boolean;
  impressions: boolean;
  ctr: boolean;
  conversions: boolean;
  leads: boolean;
  messages: boolean;
};

export const DEFAULT_WHATSAPP_METRICS: WhatsAppReportMetrics = {
  investment: true,
  revenue: true,
  roas: true,
  cpa: true,
  cpc: true,
  cpm: true,
  clicks: true,
  impressions: true,
  ctr: true,
  conversions: true,
  leads: true,
  messages: true,
};
