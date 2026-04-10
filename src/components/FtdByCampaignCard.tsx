import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

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
      <div className="card-executive p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <Skeleton className="h-[80px] w-full" />
      </div>
    );
  }

  if (ftdCampaigns.length === 0) return null;

  const formatBRL = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  const sourceLabel = (s: string) => {
    if (s.includes("meta")) return "M";
    if (s.includes("google")) return "G";
    return "•";
  };

  return (
    <div className={`card-executive p-4 animate-slide-up transition-opacity duration-500 col-span-2 sm:col-span-3 lg:col-span-5 ${isFetching ? "opacity-60" : "opacity-100"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="kpi-label">FTD por Campanha</p>
        <span className="text-[10px] text-muted-foreground">
          {ftdCampaigns.reduce((s, c) => s + c.ftd, 0)} FTDs · {ftdCampaigns.length} campanha{ftdCampaigns.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-1.5">
        {ftdCampaigns.slice(0, 8).map((c) => (
          <div key={c.name} className="flex items-center gap-2 text-xs">
            <span className="shrink-0 w-4 text-center font-mono text-[10px] text-muted-foreground">{sourceLabel(c.source)}</span>
            <span className="truncate flex-1 text-foreground" title={c.name}>{c.name}</span>
            <div className="shrink-0 w-16 h-1 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary/60" style={{ width: `${(c.ftd / maxFtd) * 100}%` }} />
            </div>
            <span className="shrink-0 w-6 text-right font-mono font-semibold text-foreground">{c.ftd}</span>
            <span className="shrink-0 w-20 text-right text-muted-foreground tabular-nums">{formatBRL(c.costPerFtd)}/ftd</span>
          </div>
        ))}
        {ftdCampaigns.length > 8 && (
          <p className="text-[10px] text-muted-foreground pl-6">+{ftdCampaigns.length - 8} campanhas</p>
        )}
      </div>
    </div>
  );
}
