import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";

const ROAS_MAX = 6;

export default function FunnelChart({ roasValue }: {roasValue?: string;}) {
  const numericRoas = useMemo(() => {
    if (!roasValue) return 3.86;
    const parsed = parseFloat(roasValue.replace("x", "").replace(",", "."));
    return isNaN(parsed) ? 3.86 : parsed;
  }, [roasValue]);

  const gaugeData = useMemo(() => {
    const filled = Math.min(numericRoas / ROAS_MAX * 100, 100);
    return [
    { name: "filled", value: filled },
    { name: "empty", value: 100 - filled }];

  }, [numericRoas]);

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "300ms" }}>
      <p className="kpi-label mb-3">ROAS</p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="70%"
              startAngle={180}
              endAngle={0}
              innerRadius={50}
              outerRadius={75}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill="hsl(217, 91%, 60%)" />
              <Cell fill="hsl(217, 25%, 22%)" />
              <Label
                value={`${numericRoas.toFixed(2)}x`}
                position="center"
                dy={-5}
                style={{ fontSize: 20, fontWeight: 700, fill: "hsl(210, 40%, 98%)" }}
              />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}