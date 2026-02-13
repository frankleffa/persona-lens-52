export default function CampaignTable() {
  const campaigns = [
    { name: "Campanha Brand - Search", status: "Ativa", spend: "R$ 8.420", leads: 312, cpa: "R$ 27,00" },
    { name: "Remarketing - Display", status: "Ativa", spend: "R$ 5.130", leads: 187, cpa: "R$ 27,43" },
    { name: "Lookalike - Social", status: "Ativa", spend: "R$ 12.300", leads: 421, cpa: "R$ 29,22" },
    { name: "Prospecção - Video", status: "Pausada", spend: "R$ 3.200", leads: 89, cpa: "R$ 35,96" },
    { name: "Performance Max", status: "Ativa", spend: "R$ 19.200", leads: 238, cpa: "R$ 80,67" },
  ];

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <p className="kpi-label mb-5">Campanhas Ativas</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Campanha</th>
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Investimento</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Leads</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">CPA</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="py-3.5 font-medium text-foreground">{c.name}</td>
                <td className="py-3.5">
                  <span className={c.status === "Ativa" ? "metric-badge-positive" : "metric-badge-negative"}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3.5 text-right font-mono text-foreground">{c.spend}</td>
                <td className="py-3.5 text-right font-mono text-foreground">{c.leads}</td>
                <td className="py-3.5 text-right font-mono text-foreground">{c.cpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
