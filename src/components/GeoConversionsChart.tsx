import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface GeoData {
  purchases: number;
  registrations: number;
  spend: number;
}

interface GeoConversionsChartProps {
  data?: Record<string, GeoData> | null;
}

type MetricType = "purchases" | "registrations" | "spend";

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil", US: "EUA", PT: "Portugal", AR: "Argentina", MX: "México",
  CO: "Colômbia", CL: "Chile", UY: "Uruguai", PE: "Peru", ES: "Espanha",
  GB: "Reino Unido", DE: "Alemanha", FR: "França", IT: "Itália", CA: "Canadá",
  JP: "Japão", AU: "Austrália", IN: "Índia",
};

export default function GeoConversionsChart({ data }: GeoConversionsChartProps) {
  const [metric, setMetric] = useState<MetricType>("purchases");

  const chartData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data)
      .map(([code, values]) => ({
        country: COUNTRY_NAMES[code] || code,
        value: metric === "spend" ? values.spend : values[metric],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [data, metric]);

  const hasData = chartData.length > 0;
  const labels: Record<MetricType, string> = {
    purchases: "Compras",
    registrations: "Cadastros",
    spend: "Investimento",
  };

  const colors: Record<MetricType, string> = {
    purchases: "hsl(165, 60%, 45%)",
    registrations: "hsl(217, 91%, 60%)",
    spend: "hsl(35, 90%, 55%)",
  };

  return (
    <>
      <div className="flex items-center gap-1.5 mb-4">
        {(Object.keys(labels) as MetricType[]).map((key) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              metric === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels[key]}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Sem dados geográficos no período selecionado.
          </p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barSize={14} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 25%, 20%)" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "hsl(215, 20%, 55%)" }}
                stroke="hsl(217, 25%, 20%)"
                allowDecimals={false}
                tickFormatter={(v) => metric === "spend" ? `R$${v.toLocaleString("pt-BR")}` : String(v)}
              />
              <YAxis
                type="category"
                dataKey="country"
                tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }}
                stroke="hsl(217, 25%, 20%)"
                width={70}
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
                formatter={(value: number) => [
                  metric === "spend" ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : value,
                  labels[metric],
                ]}
              />
              <Bar dataKey="value" fill={colors[metric]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
