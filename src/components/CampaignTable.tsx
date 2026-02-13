export default function CampaignTable({ campaigns }: { campaigns?: Array<{ name: string; status: string; spend: number; leads?: number; clicks?: number; conversions?: number; cpa: number; source?: string }> | null }) {
  const data = campaigns || [
    { name: "Campanha Brand - Search", status: "Ativa", spend: 8420, leads: 312, cpa: 27.0, source: "Google Ads" },
    { name: "Remarketing - Display", status: "Ativa", spend: 5130, leads: 187, cpa: 27.43, source: "Google Ads" },
    { name: "Lookalike - Social", status: "Ativa", spend: 12300, leads: 421, cpa: 29.22, source: "Meta Ads" },
    { name: "Prospecção - Video", status: "Pausada", spend: 3200, leads: 89, cpa: 35.96, source: "Meta Ads" },
    { name: "Performance Max", status: "Ativa", spend: 19200, leads: 238, cpa: 80.67, source: "Google Ads" },
  ];

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <p className="kpi-label mb-5">Campanhas Ativas</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Campanha</th>
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Origem</th>
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Investimento</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Leads</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">CPA</th>
            </tr>
          </thead>
          <tbody>
            {data.map((c) => (
              <tr key={c.name} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-3.5 font-medium text-foreground">{c.name}</td>
                <td className="py-3.5">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${
                    c.source === "Google Ads" ? "bg-chart-blue/15 text-chart-blue" :
                    c.source === "Meta Ads" ? "bg-chart-purple/15 text-chart-purple" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {c.source || "—"}
                  </span>
                </td>
                <td className="py-3.5">
                  <span className={c.status === "Ativa" ? "metric-badge-positive" : "metric-badge-negative"}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3.5 text-right font-mono text-foreground">
                  R$ {c.spend.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </td>
                <td className="py-3.5 text-right font-mono text-foreground">
                  {c.leads || c.conversions || 0}
                </td>
                <td className="py-3.5 text-right font-mono text-foreground">
                  R$ {c.cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
