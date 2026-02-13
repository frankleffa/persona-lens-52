import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";

const ROAS_VALUE = 3.86;
const ROAS_MAX = 6;

export default function FunnelChart() {
  const gaugeData = useMemo(() => {
    const filled = Math.min((ROAS_VALUE / ROAS_MAX) * 100, 100);
    return [
      { name: "filled", value: filled },
      { name: "empty", value: 100 - filled },
    ];
  }, []);

  return (
    <div className="card-executive p-6 animate-slide-up flex flex-col items-center justify-center" style={{ animationDelay: "300ms" }}>
      <p className="kpi-label mb-2">ROAS Gauge</p>
      <div className="h-72 w-full flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="55%"
              startAngle={220}
              endAngle={-40}
              innerRadius="60%"
              outerRadius="85%"
              dataKey="value"
              strokeWidth={0}
              cornerRadius={6}
            >
              <Cell fill="hsl(165, 60%, 45%)" />
              <Cell fill="hsl(217, 25%, 20%)" />
              <Label
                value={`${ROAS_VALUE}x`}
                position="center"
                style={{
                  fontSize: "36px",
                  fontWeight: 800,
                  fill: "hsl(210, 40%, 98%)",
                  fontFamily: "Inter",
                }}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="text-sm font-medium text-chart-positive mt-1">+8.4% vs mês anterior</p>
    </div>
  );
}
