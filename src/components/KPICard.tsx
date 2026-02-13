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
      className="card-executive p-5 animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <p className="kpi-label mb-2">{label}</p>
      <p className="kpi-value">{metric.value}</p>
      {metric.change !== 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          {metric.trend === "up" ? (
            <TrendingUp className="h-3.5 w-3.5 text-chart-positive" />
          ) : metric.trend === "down" ? (
            <TrendingDown className="h-3.5 w-3.5 text-chart-negative" />
          ) : (
            <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span
            className={`text-xs font-medium ${
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
