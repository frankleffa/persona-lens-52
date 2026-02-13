import type { MetricKey } from "@/lib/types";

const SOURCE_MAP: Record<MetricKey, { label: string; color: string }> = {
  investment: { label: "Consolidado", color: "text-muted-foreground bg-muted" },
  revenue: { label: "Consolidado", color: "text-muted-foreground bg-muted" },
  roas: { label: "Consolidado", color: "text-muted-foreground bg-muted" },
  leads: { label: "Meta Ads", color: "text-chart-purple bg-chart-purple/15" },
  cpa: { label: "Google Ads", color: "text-chart-blue bg-chart-blue/15" },
  ctr: { label: "Google Ads", color: "text-chart-blue bg-chart-blue/15" },
  cpc: { label: "Google Ads", color: "text-chart-blue bg-chart-blue/15" },
  conversion_rate: { label: "GA4", color: "text-chart-amber bg-chart-amber/15" },
  sessions: { label: "GA4", color: "text-chart-amber bg-chart-amber/15" },
  events: { label: "GA4", color: "text-chart-amber bg-chart-amber/15" },
  campaign_names: { label: "Google Ads", color: "text-chart-blue bg-chart-blue/15" },
  ad_sets: { label: "Meta Ads", color: "text-chart-purple bg-chart-purple/15" },
  attribution_comparison: { label: "Consolidado", color: "text-muted-foreground bg-muted" },
  discrepancy_percentage: { label: "Consolidado", color: "text-muted-foreground bg-muted" },
  trend_charts: { label: "Consolidado", color: "text-muted-foreground bg-muted" },
  funnel_visualization: { label: "Consolidado", color: "text-muted-foreground bg-muted" },
};

export default function SourceBadge({ metricKey }: { metricKey: MetricKey }) {
  const source = SOURCE_MAP[metricKey];
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${source.color}`}>
      {source.label}
    </span>
  );
}
