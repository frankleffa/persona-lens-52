import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { campaigns, type Campaign } from "./data";

const statusVariant: Record<Campaign["status"], "success" | "warning" | "neutral"> = {
  ativa: "success",
  limitada: "warning",
  pausada: "neutral",
};

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function CampaignsTable() {
  return (
    <div className="overflow-x-auto scroll-slim">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            {["Campanha", "Plataforma", "Status", "Invest.", "Conv.", "CPA", "ROAS", "Δ"].map(
              (h, i) => (
                <th
                  key={h}
                  className={cn(
                    "eyebrow px-3 py-2.5 font-medium",
                    i >= 3 && "text-right"
                  )}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => {
            const up = c.delta >= 0;
            const Arrow = up ? ArrowUp : ArrowDown;
            return (
              <tr
                key={c.name}
                className="border-b border-border/60 transition-colors hover:bg-surface-2/50"
              >
                <td className="px-3 py-3 font-medium text-foreground">{c.name}</td>
                <td className="px-3 py-3">
                  <Badge variant={c.platform === "Meta" ? "brand" : "neutral"}>
                    {c.platform}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <Badge variant={statusVariant[c.status]} dot>
                    {c.status}
                  </Badge>
                </td>
                <td className="tnum px-3 py-3 text-right text-muted-foreground">
                  {brl(c.spend)}
                </td>
                <td className="tnum px-3 py-3 text-right text-muted-foreground">
                  {c.conversions}
                </td>
                <td className="tnum px-3 py-3 text-right text-muted-foreground">
                  {brl(c.cpa)}
                </td>
                <td className="tnum px-3 py-3 text-right font-medium text-foreground">
                  {c.roas.toFixed(1)}x
                </td>
                <td className="px-3 py-3">
                  <span
                    className={cn(
                      "tnum flex items-center justify-end gap-1 font-medium",
                      up ? "text-success" : "text-destructive"
                    )}
                  >
                    <Arrow className="size-3" />
                    {Math.abs(c.delta).toFixed(1)}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
