export type WhatsAppReportMetrics = {
  investment: boolean;
  revenue: boolean;
  roas: boolean;
  cpa: boolean;
  clicks: boolean;
  impressions: boolean;
  ctr: boolean;
  conversions: boolean;
};

export const DEFAULT_WHATSAPP_METRICS: WhatsAppReportMetrics = {
  investment: true,
  revenue: true,
  roas: true,
  cpa: true,
  clicks: true,
  impressions: true,
  ctr: true,
  conversions: true,
};
