import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import type { MetricData } from "@/lib/types";

interface PlatformSectionProps {
  title: string;
  icon: string;
  colorClass: string;
  metrics: Record<string, MetricData>;
  metricLabels: Record<string, string>;
}

export default function PlatformSection({ title, icon, colorClass, metrics, metricLabels }: PlatformSectionProps) {
  const entries = Object.entries(metrics);
  if (entries.length === 0) return null;

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${colorClass}`}>
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
        {entries.map(([key, metric]) => {
          const change = metric.change;
          const isPositive = change > 0;
          const isNegative = change < 0;
          const isNeutral = change === 0;
          const colorCls = isNeutral
            ? "text-muted-foreground"
            : isPositive ? "text-chart-positive" : "text-chart-negative";

          return (
            <div key={key} className="card-executive p-4 lg:p-5">
              <div className="flex items-center justify-between mb-2">
                <p className="kpi-label truncate">{metricLabels[key] || key}</p>
                <span className={`hidden sm:inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${colorClass}`}>
                  {title}
                </span>
              </div>
              <p className="kpi-value text-xl lg:text-2xl">{metric.value}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {isNeutral ? (
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                ) : isPositive ? (
                  <ArrowUp className={`h-3 w-3 ${colorCls}`} />
                ) : (
                  <ArrowDown className={`h-3 w-3 ${colorCls}`} />
                )}
                {!isNeutral && (
                  <>
                    <span className={`text-xs font-semibold ${colorCls}`}>
                      {isPositive ? "+" : ""}{change.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-0.5">vs anterior</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
