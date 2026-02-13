import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { name: "Último Clique", value: 42 },
  { name: "Primeiro Clique", value: 18 },
  { name: "Linear", value: 25 },
  { name: "Baseado em Posição", value: 15 },
];

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(165, 60%, 45%)",
  "hsl(38, 92%, 55%)",
  "hsl(270, 60%, 60%)",
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
                background: "hsl(217, 33%, 14%)",
                border: "1px solid hsl(217, 25%, 22%)",
                borderRadius: "10px",
                fontSize: 13,
                color: "hsl(210, 40%, 98%)",
                boxShadow: "0 8px 24px hsl(0 0% 0% / 0.4)",
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "hsl(215, 20%, 55%)" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
