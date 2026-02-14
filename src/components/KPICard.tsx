import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricData, MetricKey } from "@/lib/types";
import SourceBadge from "@/components/SourceBadge";

interface KPICardProps {
  metric: MetricData;
  label: string;
  delay?: number;
  metricKey?: MetricKey;
}

export default function KPICard({ metric, label, delay = 0, metricKey }: KPICardProps) {
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
      {metric.change !== 0 && (
        <div className="mt-2 lg:mt-3 flex items-center gap-2">
          {metric.trend === "up" ? (
            <div className="flex items-center justify-center rounded-full bg-chart-positive/15 p-1">
              <TrendingUp className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-chart-positive" />
            </div>
          ) : metric.trend === "down" ? (
            <div className="flex items-center justify-center rounded-full bg-chart-negative/15 p-1">
              <TrendingDown className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-chart-negative" />
            </div>
          ) : (
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span
            className={`text-xs lg:text-sm font-semibold ${
              metric.change > 0 ? "text-chart-positive" : metric.change < 0 ? "text-chart-negative" : "text-muted-foreground"
            }`}
          >
            {metric.change > 0 ? "+" : ""}
            {metric.change}%
          </span>
        </div>
      )}
    </div>
  );
}
