import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { MetricData } from "@/lib/types";

interface KPICardProps {
  metric: MetricData;
  label: string;
  delay?: number;
}

export default function KPICard({ metric, label, delay = 0 }: KPICardProps) {
  return (
    <div
      className="card-executive p-6 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="kpi-label mb-3">{label}</p>
      <p className="kpi-value">{metric.value}</p>
      {metric.change !== 0 && (
        <div className="mt-3 flex items-center gap-2">
          {metric.trend === "up" ? (
            <div className="flex items-center justify-center rounded-full bg-chart-positive/15 p-1">
              <TrendingUp className="h-3.5 w-3.5 text-chart-positive" />
            </div>
          ) : metric.trend === "down" ? (
            <div className="flex items-center justify-center rounded-full bg-chart-negative/15 p-1">
              <TrendingDown className="h-3.5 w-3.5 text-chart-negative" />
            </div>
          ) : (
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span
            className={`text-sm font-semibold ${
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
