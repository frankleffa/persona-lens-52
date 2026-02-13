import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Jan", revenue: 42000, investment: 12000 },
  { name: "Fev", revenue: 58000, investment: 15000 },
  { name: "Mar", revenue: 49000, investment: 13500 },
  { name: "Abr", revenue: 72000, investment: 18000 },
  { name: "Mai", revenue: 68000, investment: 17000 },
  { name: "Jun", revenue: 81000, investment: 20000 },
  { name: "Jul", revenue: 94000, investment: 22000 },
  { name: "Ago", revenue: 87000, investment: 21000 },
  { name: "Set", revenue: 102000, investment: 24000 },
  { name: "Out", revenue: 115000, investment: 26000 },
  { name: "Nov", revenue: 108000, investment: 25000 },
  { name: "Dez", revenue: 132000, investment: 28000 },
];

export default function TrendChart() {
  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "200ms" }}>
      <p className="kpi-label mb-5">Receita vs Investimento</p>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(165, 60%, 45%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(165, 60%, 45%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(217, 91%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 25%, 20%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} stroke="hsl(217, 25%, 20%)" />
            <YAxis tick={{ fontSize: 11, fill: "hsl(215, 20%, 55%)" }} stroke="hsl(217, 25%, 20%)" tickFormatter={(v) => `${v/1000}k`} />
            <Tooltip
              contentStyle={{
                background: "hsl(217, 33%, 14%)",
                border: "1px solid hsl(217, 25%, 22%)",
                borderRadius: "10px",
                fontSize: 13,
                color: "hsl(210, 40%, 98%)",
                boxShadow: "0 8px 24px hsl(0 0% 0% / 0.4)",
              }}
              formatter={(value: number) => [`R$ ${(value).toLocaleString("pt-BR")}`, ""]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Receita"
              stroke="hsl(165, 60%, 45%)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="investment"
              name="Investimento"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorInvestment)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
