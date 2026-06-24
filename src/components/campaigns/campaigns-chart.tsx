"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { series } from "./meta-data";

const brlk = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`);

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="mb-1.5 font-medium text-foreground">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span>{p.dataKey === "spend" ? "Valor gasto" : "Resultados"}</span>
          <span className="tnum ml-auto font-medium text-foreground">
            {p.dataKey === "spend"
              ? `R$ ${p.value.toLocaleString("pt-BR")}`
              : p.value.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CampaignsChart() {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--soft-foreground)", fontSize: 11 }}
          dy={6}
        />
        <YAxis
          yAxisId="spend"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--soft-foreground)", fontSize: 11 }}
          tickFormatter={brlk}
          width={56}
        />
        <YAxis
          yAxisId="results"
          orientation="right"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--soft-foreground)", fontSize: 11 }}
          width={32}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--surface-2)", opacity: 0.4 }} />
        <Bar
          yAxisId="spend"
          dataKey="spend"
          fill="var(--primary)"
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
          opacity={0.85}
        />
        <Line
          yAxisId="results"
          type="monotone"
          dataKey="results"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
