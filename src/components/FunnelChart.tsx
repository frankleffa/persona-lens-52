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

  return;




































}