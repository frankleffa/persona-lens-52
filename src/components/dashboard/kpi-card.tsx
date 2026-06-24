import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { Kpi } from "./data";

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const positive = kpi.invert ? kpi.delta < 0 : kpi.delta > 0;
  const neutral = kpi.delta === 0;
  const Arrow = kpi.delta > 0 ? ArrowUp : ArrowDown;

  return (
    <Card className="group p-5 transition-colors hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="eyebrow">{kpi.label}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-soft-foreground">
          {kpi.source}
        </span>
      </div>

      <div className="metric mt-4 whitespace-nowrap text-[1.75rem] font-medium text-foreground">
        {kpi.value}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-xs">
        {neutral ? (
          <span className="text-muted-foreground">sem variação</span>
        ) : (
          <>
            <Arrow
              className={cn(
                "size-3.5",
                positive ? "text-success" : "text-destructive"
              )}
            />
            <span
              className={cn(
                "tnum font-medium",
                positive ? "text-success" : "text-destructive"
              )}
            >
              {kpi.delta > 0 ? "+" : ""}
              {kpi.delta.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">vs período anterior</span>
          </>
        )}
      </div>
    </Card>
  );
}
