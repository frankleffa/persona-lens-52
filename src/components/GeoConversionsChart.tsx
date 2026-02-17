import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface GeoData {
  purchases: number;
  registrations: number;
  messages: number;
  spend: number;
}

type GeoRecord = Record<string, GeoData>;

interface GeoConversionsChartProps {
  data?: GeoRecord | null;
  dataRegion?: GeoRecord | null;
  dataCity?: GeoRecord | null;
}

type MetricType = "purchases" | "registrations" | "messages" | "spend";
type GeoLevel = "country" | "region" | "city";

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil", US: "EUA", PT: "Portugal", AR: "Argentina", MX: "México",
  CO: "Colômbia", CL: "Chile", UY: "Uruguai", PE: "Peru", ES: "Espanha",
  GB: "Reino Unido", DE: "Alemanha", FR: "França", IT: "Itália", CA: "Canadá",
  JP: "Japão", AU: "Austrália", IN: "Índia",
};

const LABELS: Record<MetricType, string> = {
  purchases: "Compras",
  registrations: "Cadastros",
  messages: "Mensagens",
  spend: "Investimento",
};

const GEO_LABELS: Record<GeoLevel, string> = {
  country: "País",
  region: "Estado",
  city: "Cidade",
};

const COLORS: Record<MetricType, string> = {
  purchases: "hsl(165, 60%, 45%)",
  registrations: "hsl(217, 91%, 60%)",
  messages: "hsl(280, 70%, 55%)",
  spend: "hsl(35, 90%, 55%)",
};

export default function GeoConversionsChart({ data, dataRegion, dataCity }: GeoConversionsChartProps) {
  const [metric, setMetric] = useState<MetricType>("purchases");
  const [level, setLevel] = useState<GeoLevel>("country");

  const activeData = level === "region" ? dataRegion : level === "city" ? dataCity : data;

  const chartData = useMemo(() => {
    if (!activeData) return [];
    return Object.entries(activeData)
      .map(([code, values]) => ({
        country: level === "country" ? (COUNTRY_NAMES[code] || code) : code,
        value: values[metric],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);
  }, [activeData, metric, level]);

  const hasData = chartData.length > 0;

  return (
    <>
      {/* Level toggle */}
      <div className="flex items-center gap-1.5 mb-3">
        {(Object.keys(GEO_LABELS) as GeoLevel[]).map((key) => (
          <button
            key={key}
            onClick={() => setLevel(key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              level === key
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {GEO_LABELS[key]}
          </button>
        ))}
      </div>

      {/* Metric toggle */}
      <div className="flex items-center gap-1.5 mb-4">
        {(Object.keys(LABELS) as MetricType[]).map((key) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              metric === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {LABELS[key]}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Sem dados de {GEO_LABELS[level].toLowerCase()} no período selecionado.
          </p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barSize={14} margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
                allowDecimals={false}
                tickFormatter={(v) => metric === "spend" ? `R$${v.toLocaleString("pt-BR")}` : String(v)}
              />
              <YAxis
                type="category"
                dataKey="country"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                stroke="hsl(var(--border))"
                width={90}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "10px",
                  fontSize: 13,
                  color: "hsl(var(--foreground))",
                  boxShadow: "0 8px 24px hsl(0 0% 0% / 0.4)",
                }}
                formatter={(value: number) => [
                  metric === "spend" ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : value,
                  LABELS[metric],
                ]}
              />
              <Bar dataKey="value" fill={COLORS[metric]} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
