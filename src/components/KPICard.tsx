import { TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import type { MetricData, MetricKey } from "@/lib/types";
import SourceBadge from "@/components/SourceBadge";

interface KPICardProps {
  metric: MetricData;
  label: string;
  delay?: number;
  metricKey?: MetricKey;
}

export default function KPICard({ metric, label, delay = 0, metricKey }: KPICardProps) {
  const change = metric.change;
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isNeutral = change === 0;

  // For CPA, lower is better — invert the color logic
  const invertedMetrics: MetricKey[] = ["cpa", "google_cpa", "meta_cpa"];
  const isInverted = metricKey && invertedMetrics.includes(metricKey);
  
  const colorClass = isNeutral
    ? "text-muted-foreground"
    : isInverted
      ? (isPositive ? "text-chart-negative" : "text-chart-positive")
      : (isPositive ? "text-chart-positive" : "text-chart-negative");

  return (
    <div
      className="card-executive p-4 lg:p-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2 lg:mb-3">
        <p className="kpi-label truncate">{label}</p>
        {metricKey && <SourceBadge metricKey={metricKey} />}
      </div>
      <p className="kpi-value text-xl lg:text-2xl">{metric.value}</p>
      
      {/* Trend indicator */}
      <div className="mt-2 lg:mt-3 flex items-center gap-1.5">
        {isNeutral ? (
          <>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">sem mudança</span>
          </>
        ) : (
          <>
            {isPositive ? (
              <ArrowUp className={`h-3 w-3 ${colorClass}`} />
            ) : (
              <ArrowDown className={`h-3 w-3 ${colorClass}`} />
            )}
            <span className={`text-xs font-semibold ${colorClass}`}>
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground ml-0.5">vs período anterior</span>
          </>
        )}
      </div>
    </div>
  );
}
