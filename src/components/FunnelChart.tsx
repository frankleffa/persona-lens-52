import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { stage: "Visitantes", value: 34521 },
  { stage: "Leads", value: 12847 },
  { stage: "MQLs", value: 4230 },
  { stage: "SQLs", value: 1856 },
  { stage: "Clientes", value: 742 },
];

export default function FunnelChart() {
  return (
    <div className="card-executive p-5 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <p className="kpi-label mb-4">Funil de Conversão</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 90%)" />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 45%)" />
            <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} stroke="hsl(220, 10%, 45%)" width={80} />
            <Tooltip
              contentStyle={{
                background: "hsl(0, 0%, 100%)",
                border: "1px solid hsl(220, 15%, 90%)",
                borderRadius: "8px",
                fontSize: 13,
              }}
            />
            <Bar dataKey="value" fill="hsl(220, 70%, 50%)" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
