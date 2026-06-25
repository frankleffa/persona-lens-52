"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PortalPoint } from "@/components/agency/data";

const fmt = (v: number) => (v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v}`);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <div className="mb-1.5 font-medium text-foreground">{label}</div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span>{p.dataKey === "invest" ? "Investimento" : "Resultado"}</span>
          <span className="tnum ml-auto font-medium text-foreground">
            R$ {p.value.toLocaleString("pt-BR")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PortalChart({ data }: { data: PortalPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="pInvest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="pResult" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: "var(--soft-foreground)", fontSize: 12 }} />
        <YAxis tickFormatter={fmt} tickLine={false} axisLine={false} tick={{ fill: "var(--soft-foreground)", fontSize: 12 }} width={56} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="invest" stroke="var(--muted-foreground)" strokeWidth={2} fill="url(#pInvest)" />
        <Area type="monotone" dataKey="resultado" stroke="var(--primary)" strokeWidth={2} fill="url(#pResult)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
