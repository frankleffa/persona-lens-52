import { useState, useMemo } from "react";
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3, TrendingUp } from "lucide-react";

interface HourlyData {
  purchases_by_hour?: Record<string, number>;
  registrations_by_hour?: Record<string, number>;
  messages_by_hour?: Record<string, number>;
}

interface HourlyConversionsChartProps {
  data?: HourlyData | null;
  embedded?: boolean;
}

type ConversionType = "purchases" | "registrations" | "messages";
type ChartMode = "bar" | "area";

const TYPE_LABELS: Record<ConversionType, string> = {
  purchases: "Compras",
  registrations: "Cadastros",
  messages: "Mensagens",
};

const BAR_FILL = "url(#coralGradient)";

export default function HourlyConversionsChart({ data, embedded }: HourlyConversionsChartProps) {
  const [type, setType] = useState<ConversionType>("purchases");
  const [chartMode, setChartMode] = useState<ChartMode>("area");

  const chartData = useMemo(() => {
    const hourlyMap = type === "purchases"
      ? data?.purchases_by_hour
      : type === "registrations"
        ? data?.registrations_by_hour
        : data?.messages_by_hour;

    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}h`,
      value: hourlyMap?.[String(i)] || 0,
    }));
  }, [data, type]);

  const hasData = chartData.some((d) => d.value > 0);
  const label = TYPE_LABELS[type];
  const total = useMemo(() => chartData.reduce((sum, d) => sum + d.value, 0), [chartData]);

  const tickerSection = (
    <div className="flex items-baseline gap-3 mb-4">
      <span style={{ fontFamily: "'Geist Mono', monospace", fontWeight: 700, fontSize: 28, color: "hsl(var(--foreground))" }}>
        {total.toLocaleString()}
      </span>
      <span style={{ fontFamily: "'Geist', sans-serif", fontWeight: 500, fontSize: 11, color: "hsl(var(--muted-foreground))", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label} hoje
      </span>
    </div>
  );

  const emptyState = (
    <div className="flex h-40 items-center justify-center border border-dashed border-border" style={{ borderRadius: 'var(--radius-md)' }}>
      <p className="text-[13px] text-muted-foreground/25">
        Sem dados de {label.toLowerCase()} no período selecionado.
      </p>
    </div>
  );

  const barChartContent = (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barSize={12}>
          <defs>
            <linearGradient id="coralGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.4)" />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="transparent" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "'Geist Mono', monospace" }}
            stroke="transparent"
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontFamily: "'Geist Mono', monospace" }}
            stroke="transparent"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--primary) / 0.3)",
              borderRadius: "6px",
              fontSize: 12,
              fontFamily: "'Geist Mono', monospace",
              color: "hsl(var(--foreground))",
              padding: "8px 12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            }}
            formatter={(value: number) => [value, label]}
            labelFormatter={(l) => `Hora: ${l}`}
          />
          <Bar
            dataKey="value"
            fill={BAR_FILL}
            radius={[4, 4, 0, 0]}
            isAnimationActive={true}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const areaChartContent = (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
              <stop offset="60%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="hour"
            tick={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            tick={{ fontFamily: "'Geist Mono', monospace", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <CartesianGrid vertical={false} stroke="hsl(var(--border) / 0.3)" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--primary) / 0.3)",
              borderRadius: "6px",
              fontFamily: "'Geist Mono', monospace",
              fontSize: 12,
              color: "hsl(var(--foreground))",
              padding: "8px 12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
            }}
            cursor={{ stroke: "hsl(var(--primary) / 0.3)", strokeWidth: 1 }}
            formatter={(value: number) => [value, label]}
            labelFormatter={(l) => `Hora: ${l}`}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#colorConv)"
            dot={false}
            activeDot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );

  const chartContent = !hasData ? emptyState : chartMode === "bar" ? barChartContent : areaChartContent;

  const modeToggle = (
    <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
      <button
        type="button"
        onClick={() => setChartMode("bar")}
        className={`rounded-md p-1.5 transition-colors ${chartMode === "bar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        title="Barras"
      >
        <BarChart3 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => setChartMode("area")}
        className={`rounded-md p-1.5 transition-colors ${chartMode === "area" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        title="Linha"
      >
        <TrendingUp className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  const typeButtons = (size: "sm" | "md") => {
    const px = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";
    return (Object.keys(TYPE_LABELS) as ConversionType[]).map((key) => (
      <button
        key={key}
        type="button"
        onClick={() => setType(key)}
        className={`rounded-md ${px} text-xs font-medium transition-colors ${type === key
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
          }`}
      >
        {TYPE_LABELS[key]}
      </button>
    ));
  };

  if (embedded) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-1.5">
            {typeButtons("sm")}
          </div>
          {modeToggle}
        </div>
        {tickerSection}
        {chartContent}
      </>
    );
  }

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <div className="flex items-center justify-between mb-5">
        <p className="kpi-label">Conversões por Hora</p>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
            {typeButtons("md")}
          </div>
          {modeToggle}
        </div>
      </div>
      {tickerSection}
      {chartContent}
    </div>
  );
}
