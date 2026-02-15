import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface HourlyData {
  purchases_by_hour?: Record<string, number>;
  registrations_by_hour?: Record<string, number>;
}

interface HourlyConversionsChartProps {
  data?: HourlyData | null;
  embedded?: boolean;
}

type ConversionType = "purchases" | "registrations";

export default function HourlyConversionsChart({ data, embedded }: HourlyConversionsChartProps) {
  const [type, setType] = useState<ConversionType>("purchases");

  const chartData = useMemo(() => {
    const hourlyMap = type === "purchases"
      ? data?.purchases_by_hour
      : data?.registrations_by_hour;

    return Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}h`,
      value: hourlyMap?.[String(i)] || 0,
    }));
  }, [data, type]);

  const hasData = chartData.some((d) => d.value > 0);
  const label = type === "purchases" ? "Compras" : "Cadastros";

  const chartContent = !hasData ? (
    <div className="flex h-64 items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Sem dados de {label.toLowerCase()} no período selecionado.
      </p>
    </div>
  ) : (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 25%, 20%)" vertical={false} />
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }}
            stroke="hsl(217, 25%, 20%)"
            interval={2}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }}
            stroke="hsl(217, 25%, 20%)"
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(217, 33%, 14%)",
              border: "1px solid hsl(217, 25%, 22%)",
              borderRadius: "10px",
              fontSize: 13,
              color: "hsl(210, 40%, 98%)",
              boxShadow: "0 8px 24px hsl(0 0% 0% / 0.4)",
            }}
            formatter={(value: number) => [value, label]}
            labelFormatter={(label) => `Hora: ${label}`}
          />
          <Bar
            dataKey="value"
            fill={type === "purchases" ? "hsl(165, 60%, 45%)" : "hsl(217, 91%, 60%)"}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  if (embedded) {
    return (
      <>
        <div className="flex items-center gap-1.5 mb-4">
          <button
            onClick={() => setType("purchases")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              type === "purchases"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Compras
          </button>
          <button
            onClick={() => setType("registrations")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              type === "registrations"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cadastros
          </button>
        </div>
        {chartContent}
      </>
    );
  }

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <div className="flex items-center justify-between mb-5">
        <p className="kpi-label">Conversões por Hora</p>
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setType("purchases")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              type === "purchases"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Compras
          </button>
          <button
            onClick={() => setType("registrations")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              type === "registrations"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Cadastros
          </button>
        </div>
      </div>
      {chartContent}
    </div>
  );
}
