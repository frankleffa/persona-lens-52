import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { name: "Último Clique", value: 42 },
  { name: "Primeiro Clique", value: 18 },
  { name: "Linear", value: 25 },
  { name: "Baseado em Posição", value: 15 },
];

const COLORS = [
  "var(--accent)",
  "var(--accent2)",
  "var(--muted)",
  "var(--border2)",
];

export default function AttributionChart() {
  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "350ms" }}>
      <p className="kpi-label mb-5">Comparação de Atribuição</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={3} strokeWidth={0}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "0px",
                fontSize: 13,
                fontFamily: "Syne, sans-serif",
                color: "var(--text)",
                boxShadow: "none",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)", fontFamily: "Syne, sans-serif" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
