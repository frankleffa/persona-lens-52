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

const BAR_FILL = "url(#coralGradientH)";

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
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${level === key
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
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${metric === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
              }`}
          >
            {LABELS[key]}
          </button>
        ))}
      </div>

      {!hasData ? (
        <div className="flex h-40 items-center justify-center border border-dashed border-[rgba(255,255,255,0.08)]" style={{ borderRadius: 'var(--radius-md)' }}>
          <p className="text-[13px] text-[rgba(240,236,230,0.25)]">
            Sem dados de {GEO_LABELS[level].toLowerCase()} no período selecionado.
          </p>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" barSize={14} margin={{ left: 10 }}>
              <defs>
                <linearGradient id="coralGradientH" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(255,92,58,0.4)" />
                  <stop offset="100%" stopColor="#FF5C3A" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="transparent" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 10, fill: "rgba(240,236,230,0.3)", fontFamily: "'Geist Mono', monospace" }}
                stroke="transparent"
                allowDecimals={false}
                tickFormatter={(v) => metric === "spend" ? `R$${v.toLocaleString("pt-BR")}` : String(v)}
              />
              <YAxis
                type="category"
                dataKey="country"
                tick={{ fontSize: 11, fill: "rgba(240,236,230,0.3)", fontFamily: "'Geist Mono', monospace" }}
                stroke="transparent"
                width={90}
              />
              <Tooltip
                contentStyle={{
                  background: "#181818",
                  border: "1px solid rgba(255,92,58,0.3)",
                  borderRadius: "6px",
                  fontSize: 12,
                  fontFamily: "'Geist Mono', monospace",
                  color: "#f0ece6",
                  padding: "8px 12px",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                }}
                formatter={(value: number) => [
                  metric === "spend" ? `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : value,
                  LABELS[metric],
                ]}
              />
              <Bar dataKey="value" fill={BAR_FILL} radius={[0, 4, 4, 0]} isAnimationActive={true} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
