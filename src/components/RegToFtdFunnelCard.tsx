import { useMemo } from "react";
import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface DailyRow {
  date: string;
  registrations?: number;
  ftd?: number;
  spend?: number;
}

interface RegToFtdFunnelCardProps {
  dailyRows: DailyRow[];
  previousRows?: DailyRow[];
  isLoading?: boolean;
  isFetching?: boolean;
}

export default function RegToFtdFunnelCard({ dailyRows, previousRows, isLoading, isFetching }: RegToFtdFunnelCardProps) {
  const { totalRegs, totalFtd, convRate, costPerReg, costPerFtd, prevConvRate, change } = useMemo(() => {
    let regs = 0, ftds = 0, spend = 0;
    for (const r of dailyRows) {
      regs += Number(r.registrations) || 0;
      ftds += Number(r.ftd) || 0;
      spend += Number(r.spend) || 0;
    }
    const rate = regs > 0 ? (ftds / regs) * 100 : 0;
    const cpReg = regs > 0 ? spend / regs : 0;
    const cpFtd = ftds > 0 ? spend / ftds : 0;

    let prevRegs = 0, prevFtds = 0;
    if (previousRows) {
      for (const r of previousRows) {
        prevRegs += Number(r.registrations) || 0;
        prevFtds += Number(r.ftd) || 0;
      }
    }
    const pRate = prevRegs > 0 ? (prevFtds / prevRegs) * 100 : 0;
    const ch = pRate > 0 ? ((rate - pRate) / pRate) * 100 : 0;

    return { totalRegs: regs, totalFtd: ftds, convRate: rate, costPerReg: cpReg, costPerFtd: cpFtd, prevConvRate: pRate, change: ch };
  }, [dailyRows, previousRows]);

  if (isLoading) {
    return (
      <div className="card-executive p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-7 w-20" />
      </div>
    );
  }

  if (totalRegs === 0 && totalFtd === 0) return null;

  const isPositive = change > 0;
  const isNeutral = change === 0;
  const colorClass = isNeutral
    ? "text-muted-foreground"
    : isPositive ? "text-chart-positive" : "text-chart-negative";

  const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  // Funnel bar widths
  const maxVal = Math.max(totalRegs, totalFtd, 1);
  const regPct = (totalRegs / maxVal) * 100;
  const ftdPct = (totalFtd / maxVal) * 100;

  return (
    <div className={`card-executive p-4 animate-slide-up transition-opacity duration-500 ${isFetching ? "opacity-60" : "opacity-100"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="kpi-label">Funil Cadastro → FTD</p>
        <div className="flex items-center gap-1">
          {isNeutral ? (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          ) : isPositive ? (
            <ArrowUp className={`h-3 w-3 ${colorClass}`} />
          ) : (
            <ArrowDown className={`h-3 w-3 ${colorClass}`} />
          )}
          {!isNeutral && (
            <span className={`text-[10px] font-mono font-medium ${colorClass}`}>
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Main rate */}
      <p className="kpi-value text-[28px] mb-2">{convRate.toFixed(1)}%</p>

      {/* Mini funnel bars */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-muted-foreground shrink-0">Cadastros</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary/50" style={{ width: `${regPct}%` }} />
          </div>
          <span className="w-10 text-right font-mono text-foreground">{totalRegs}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-16 text-muted-foreground shrink-0">FTDs</span>
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${ftdPct}%` }} />
          </div>
          <span className="w-10 text-right font-mono font-semibold text-foreground">{totalFtd}</span>
        </div>
      </div>

      {/* Cost stats */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span>C/Cadastro: {formatBRL(costPerReg)}</span>
        <span>C/FTD: {formatBRL(costPerFtd)}</span>
      </div>
    </div>
  );
}
