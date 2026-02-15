import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

const TYPE_LABELS: Record<ConversionType, string> = {
  purchases: "Compras",
  registrations: "Cadastros",
  messages: "Mensagens",
};

const TYPE_COLORS: Record<ConversionType, string> = {
  purchases: "hsl(165, 60%, 45%)",
  registrations: "hsl(217, 91%, 60%)",
  messages: "hsl(280, 70%, 55%)",
};

export default function HourlyConversionsChart({ data, embedded }: HourlyConversionsChartProps) {
  const [type, setType] = useState<ConversionType>("purchases");

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
            fill={TYPE_COLORS[type]}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const typeButtons = (size: "sm" | "md") => {
    const px = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";
    return (Object.keys(TYPE_LABELS) as ConversionType[]).map((key) => (
      <button
        key={key}
        onClick={() => setType(key)}
        className={`rounded-md ${px} text-xs font-medium transition-colors ${
          type === key
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
        <div className="flex items-center gap-1.5 mb-4">
          {typeButtons("sm")}
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
          {typeButtons("md")}
        </div>
      </div>
      {chartContent}
    </div>
  );
}
