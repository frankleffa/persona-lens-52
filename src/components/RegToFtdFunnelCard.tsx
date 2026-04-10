import { useMemo } from "react";
import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

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
  const { totalRegs, totalFtd, totalSpend, convRate, costPerReg, costPerFtd, prevRegs, prevFtds, prevConvRate, change } = useMemo(() => {
    let regs = 0, ftds = 0, spend = 0;
    for (const r of dailyRows) {
      regs += Number(r.registrations) || 0;
      ftds += Number(r.ftd) || 0;
      spend += Number(r.spend) || 0;
    }
    const rate = regs > 0 ? (ftds / regs) * 100 : 0;
    const cpReg = regs > 0 ? spend / regs : 0;
    const cpFtd = ftds > 0 ? spend / ftds : 0;

    let pRegs = 0, pFtds = 0;
    if (previousRows) {
      for (const r of previousRows) {
        pRegs += Number(r.registrations) || 0;
        pFtds += Number(r.ftd) || 0;
      }
    }
    const pRate = pRegs > 0 ? (pFtds / pRegs) * 100 : 0;
    const ch = pRate > 0 ? ((rate - pRate) / pRate) * 100 : 0;

    return { totalRegs: regs, totalFtd: ftds, totalSpend: spend, convRate: rate, costPerReg: cpReg, costPerFtd: cpFtd, prevRegs: pRegs, prevFtds: pFtds, prevConvRate: pRate, change: ch };
  }, [dailyRows, previousRows]);

  if (isLoading) {
    return (
      <div className="card-executive p-3 sm:p-4">
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

  const maxVal = Math.max(totalRegs, totalFtd, 1);
  const regPct = (totalRegs / maxVal) * 100;
  const ftdPct = (totalFtd / maxVal) * 100;

  const hasPrevious = previousRows && previousRows.length > 0 && (prevRegs > 0 || prevFtds > 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={`card-executive p-3 sm:p-4 animate-slide-up cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all duration-300 ${isFetching ? "opacity-60" : "opacity-100"}`}>
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
          <p className="kpi-value text-[24px] sm:text-[28px] mb-2">{convRate.toFixed(1)}%</p>

          {/* Mini funnel bars */}
          <div className="space-y-1 mb-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-14 sm:w-16 text-muted-foreground shrink-0">Cadastros</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary/50" style={{ width: `${regPct}%` }} />
              </div>
              <span className="w-10 text-right font-mono text-foreground">{totalRegs}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-14 sm:w-16 text-muted-foreground shrink-0">FTDs</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${ftdPct}%` }} />
              </div>
              <span className="w-10 text-right font-mono font-semibold text-foreground">{totalFtd}</span>
            </div>
          </div>

          {/* Cost stats */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span>C/Cadastro: {formatBRL(costPerReg)}</span>
            <span>C/FTD: {formatBRL(costPerFtd)}</span>
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent className="w-72 sm:w-80 p-4" align="start">
        <p className="text-sm font-semibold text-foreground mb-3">Detalhes do Funil</p>

        {/* Comparison table */}
        <div className="space-y-2 text-xs">
          <div className="grid grid-cols-3 gap-1 text-muted-foreground font-medium border-b border-border pb-1">
            <span />
            <span className="text-right">Atual</span>
            {hasPrevious && <span className="text-right">Anterior</span>}
          </div>
          <div className="grid grid-cols-3 gap-1">
            <span className="text-muted-foreground">Cadastros</span>
            <span className="text-right font-mono text-foreground">{totalRegs}</span>
            {hasPrevious && <span className="text-right font-mono text-muted-foreground">{prevRegs}</span>}
          </div>
          <div className="grid grid-cols-3 gap-1">
            <span className="text-muted-foreground">FTDs</span>
            <span className="text-right font-mono font-semibold text-foreground">{totalFtd}</span>
            {hasPrevious && <span className="text-right font-mono text-muted-foreground">{prevFtds}</span>}
          </div>
          <div className="grid grid-cols-3 gap-1">
            <span className="text-muted-foreground">Conversão</span>
            <span className="text-right font-mono text-foreground">{convRate.toFixed(1)}%</span>
            {hasPrevious && <span className="text-right font-mono text-muted-foreground">{prevConvRate.toFixed(1)}%</span>}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-3" />

        {/* Cost details */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Investimento</span>
            <span className="font-mono text-foreground">{formatBRL(totalSpend)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo / Cadastro</span>
            <span className="font-mono text-foreground">{formatBRL(costPerReg)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo / FTD</span>
            <span className="font-mono font-semibold text-foreground">{formatBRL(costPerFtd)}</span>
          </div>
        </div>

        {/* Variation badge */}
        {!isNeutral && (
          <div className={`mt-3 text-xs font-medium ${colorClass} flex items-center gap-1`}>
            {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {isPositive ? "+" : ""}{change.toFixed(1)}% vs período anterior
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
