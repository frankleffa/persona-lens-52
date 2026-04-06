import { useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
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
  const { totalRegs, totalFtd, convRate, costPerReg, costPerFtd, chartData, prevConvRate, change } = useMemo(() => {
    let regs = 0, ftds = 0, spend = 0;
    for (const r of dailyRows) {
      regs += Number(r.registrations) || 0;
      ftds += Number(r.ftd) || 0;
      spend += Number(r.spend) || 0;
    }
    const rate = regs > 0 ? (ftds / regs) * 100 : 0;
    const cpReg = regs > 0 ? spend / regs : 0;
    const cpFtd = ftds > 0 ? spend / ftds : 0;

    // Group by date for chart
    const dateMap = new Map<string, { date: string; registrations: number; ftd: number; rate: number }>();
    for (const r of dailyRows) {
      const d = r.date;
      const existing = dateMap.get(d);
      if (existing) {
        existing.registrations += Number(r.registrations) || 0;
        existing.ftd += Number(r.ftd) || 0;
      } else {
        dateMap.set(d, { date: d, registrations: Number(r.registrations) || 0, ftd: Number(r.ftd) || 0, rate: 0 });
      }
    }
    const sorted = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    // Calculate cumulative rate for trend
    let cumRegs = 0, cumFtd = 0;
    for (const day of sorted) {
      cumRegs += day.registrations;
      cumFtd += day.ftd;
      day.rate = cumRegs > 0 ? (cumFtd / cumRegs) * 100 : 0;
    }

    // Previous period rate
    let prevRegs = 0, prevFtds = 0;
    if (previousRows) {
      for (const r of previousRows) {
        prevRegs += Number(r.registrations) || 0;
        prevFtds += Number(r.ftd) || 0;
      }
    }
    const pRate = prevRegs > 0 ? (prevFtds / prevRegs) * 100 : 0;
    const ch = pRate > 0 ? ((rate - pRate) / pRate) * 100 : 0;

    return { totalRegs: regs, totalFtd: ftds, convRate: rate, costPerReg: cpReg, costPerFtd: cpFtd, chartData: sorted, prevConvRate: pRate, change: ch };
  }, [dailyRows, previousRows]);

  if (isLoading) {
    return (
      <div className="card-executive p-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-[140px] w-full" />
      </div>
    );
  }

  if (totalRegs === 0 && totalFtd === 0) return null;

  const isPositive = change > 0;
  const isNeutral = change === 0;
  const colorClass = isNeutral
    ? "text-muted-foreground"
    : isPositive ? "text-chart-positive" : "text-chart-negative";

  const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  return (
    <div className={`card-executive p-6 animate-slide-up transition-opacity duration-500 ${isFetching ? "opacity-60" : "opacity-100"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="kpi-label">Funil Cadastro → FTD</p>
        <div className="flex items-center gap-1.5">
          {isNeutral ? (
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          ) : isPositive ? (
            <ArrowUp className={`h-3 w-3 ${colorClass}`} />
          ) : (
            <ArrowDown className={`h-3 w-3 ${colorClass}`} />
          )}
          {!isNeutral && (
            <span className={`text-xs font-mono font-medium ${colorClass}`}>
              {isPositive ? "+" : ""}{change.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Main rate */}
      <p className="kpi-value text-[28px] mb-1">{convRate.toFixed(1)}%</p>

      {/* Stats row */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
        <span>{totalRegs} cadastros</span>
        <span>{totalFtd} FTDs</span>
        <span>C/Cadastro: {formatBRL(costPerReg)}</span>
        <span>C/FTD: {formatBRL(costPerFtd)}</span>
      </div>

      {/* Mini trend chart */}
      {chartData.length >= 2 && (
        <div className="h-[80px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="funnelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                hide
              />
              <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                labelFormatter={(v) => {
                  const d = new Date(v + "T12:00:00");
                  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
                }}
                formatter={(value: number, name: string) => {
                  if (name === "rate") return [`${value.toFixed(1)}%`, "Conv. Reg→FTD"];
                  return [value, name];
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#funnelGrad)"
                dot={false}
                activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
