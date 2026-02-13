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
      <div className="grid gap-4" style={{
        gridTemplateColumns: `repeat(${Math.min(entries.length, 5)}, minmax(0, 1fr))`
      }}>
        {entries.map(([key, metric]) => (
          <div key={key} className="card-executive p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="kpi-label">{metricLabels[key] || key}</p>
              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${colorClass}`}>
                {title}
              </span>
            </div>
            <p className="kpi-value">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
