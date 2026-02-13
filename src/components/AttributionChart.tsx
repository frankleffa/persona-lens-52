import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const data = [
  { name: "Último Clique", value: 42 },
  { name: "Primeiro Clique", value: 18 },
  { name: "Linear", value: 25 },
  { name: "Baseado em Posição", value: 15 },
];

const COLORS = [
  "hsl(220, 70%, 50%)",
  "hsl(165, 60%, 40%)",
  "hsl(38, 92%, 50%)",
  "hsl(270, 60%, 55%)",
];

export default function AttributionChart() {
  return (
    <div className="card-executive p-5 animate-slide-up" style={{ animationDelay: "350ms" }}>
      <p className="kpi-label mb-4">Comparação de Atribuição</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={3}>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 15%, 90%)",
                borderRadius: "8px",
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
