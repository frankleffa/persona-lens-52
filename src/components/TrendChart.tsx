import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Jan", value: 4200 },
  { name: "Fev", value: 5800 },
  { name: "Mar", value: 4900 },
  { name: "Abr", value: 7200 },
  { name: "Mai", value: 6800 },
  { name: "Jun", value: 8100 },
  { name: "Jul", value: 9400 },
  { name: "Ago", value: 8700 },
  { name: "Set", value: 10200 },
  { name: "Out", value: 11500 },
  { name: "Nov", value: 10800 },
  { name: "Dez", value: 13200 },
];

export default function TrendChart() {
  return (
    <div className="card-executive p-5 animate-slide-up" style={{ animationDelay: "200ms" }}>
      <p className="kpi-label mb-4">Tendência de Performance</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 45%)" />
            <YAxis tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 45%)" />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 15%, 90%)",
                borderRadius: "8px",
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="hsl(220, 70%, 50%)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
