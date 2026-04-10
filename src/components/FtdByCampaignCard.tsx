import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

interface Campaign {
  name: string;
  ftd?: number;
  spend?: number;
  source?: string;
}

interface FtdByCampaignCardProps {
  campaigns: Campaign[];
  isLoading?: boolean;
  isFetching?: boolean;
}

export default function FtdByCampaignCard({ campaigns, isLoading, isFetching }: FtdByCampaignCardProps) {
  const ftdCampaigns = useMemo(() => {
    return campaigns
      .filter((c) => (c.ftd ?? 0) > 0)
      .map((c) => ({
        name: c.name,
        ftd: c.ftd ?? 0,
        spend: c.spend ?? 0,
        source: c.source ?? "",
        costPerFtd: (c.ftd ?? 0) > 0 ? (c.spend ?? 0) / (c.ftd ?? 0) : 0,
      }))
      .sort((a, b) => b.ftd - a.ftd);
  }, [campaigns]);

  const maxFtd = ftdCampaigns[0]?.ftd ?? 1;

  if (isLoading) {
    return (
      <div className="card-executive p-6">
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-[120px] w-full" />
      </div>
    );
  }

  if (ftdCampaigns.length === 0) return null;

  const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  const sourceLabel = (s: string) => {
    if (s.includes("meta")) return { label: "Meta", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
    if (s.includes("google")) return { label: "Google", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
    return { label: s || "—", color: "bg-muted text-muted-foreground" };
  };

  return (
    <div className={`card-executive p-6 animate-slide-up transition-opacity duration-500 ${isFetching ? "opacity-60" : "opacity-100"}`}>
      <p className="kpi-label mb-4">FTD por Campanha</p>

      <div className="space-y-3">
        {ftdCampaigns.map((c) => {
          const src = sourceLabel(c.source);
          return (
            <div key={c.name} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${src.color}`}>
                    {src.label}
                  </span>
                  <span className="text-sm text-foreground truncate" title={c.name}>
                    {c.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-semibold text-foreground tabular-nums">{c.ftd}</span>
                  <span className="text-xs text-muted-foreground tabular-nums w-24 text-right">
                    {formatBRL(c.costPerFtd)}/FTD
                  </span>
                </div>
              </div>
              <Progress value={(c.ftd / maxFtd) * 100} className="h-1.5" />
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4">
        Total: {ftdCampaigns.reduce((s, c) => s + c.ftd, 0)} FTDs em {ftdCampaigns.length} campanha{ftdCampaigns.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}
