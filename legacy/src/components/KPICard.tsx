import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import type { MetricData, MetricKey } from "@/lib/types";
import { isInvertedMetric } from "@/lib/metric-utils";
import { Skeleton } from "@/components/ui/skeleton";
import SourceBadge from "@/components/SourceBadge";
import MetricInfoTooltip from "@/components/MetricInfoTooltip";

interface KPICardProps {
  metric?: MetricData;
  label: string;
  delay?: number;
  metricKey?: MetricKey;
  isLoading?: boolean;
  isFetching?: boolean;
  comparisonLabel?: string;
}

function KPICardSkeleton({ label, delay = 0 }: { label: string; delay?: number }) {
  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2 lg:mb-3">
        <p className="kpi-label truncate">{label}</p>
      </div>
      <Skeleton className="h-7 w-24 mb-2" />
      <Skeleton className="h-4 w-20 mt-2" />
    </div>
  );
}

export default function KPICard({ metric, label, delay = 0, metricKey, isLoading, isFetching, comparisonLabel }: KPICardProps) {
  if (isLoading || !metric) {
    return <KPICardSkeleton label={label} delay={delay} />;
  }

  const change = metric.change;
  const isPositive = change > 0;
  const isNeutral = change === 0;

  // For CPA-like metrics, lower is better — invert the color logic
  const isInverted = metricKey ? isInvertedMetric(metricKey) : false;

  const colorClass = isNeutral
    ? "text-muted-foreground"
    : isInverted
      ? (isPositive ? "text-chart-negative" : "text-chart-positive")
      : (isPositive ? "text-chart-positive" : "text-chart-negative");

  return (
    <div
      className={`card-executive p-6 animate-slide-up transition-opacity duration-500 ${isFetching ? "opacity-60" : "opacity-100"}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <p className="kpi-label truncate">{label}</p>
          {metricKey && <MetricInfoTooltip metricKey={metricKey} />}
        </div>
        {metricKey && <SourceBadge metricKey={metricKey} />}
      </div>
      <p className="kpi-value text-[28px]">{metric.value}</p>

      {/* Trend indicator */}
      <div className="mt-3 flex items-center gap-1.5">
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
            <span className={`text-xs font-mono font-medium ${colorClass}`}>
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground ml-0.5">vs {comparisonLabel || "período anterior"}</span>
          </>
        )}
      </div>
    </div>
  );
}
