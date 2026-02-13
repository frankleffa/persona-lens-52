export default function CampaignTable() {
  const campaigns = [
    { name: "Campanha Brand - Search", status: "Ativa", spend: "R$ 8.420", leads: 312, cpa: "R$ 27,00" },
    { name: "Remarketing - Display", status: "Ativa", spend: "R$ 5.130", leads: 187, cpa: "R$ 27,43" },
    { name: "Lookalike - Social", status: "Ativa", spend: "R$ 12.300", leads: 421, cpa: "R$ 29,22" },
    { name: "Prospecção - Video", status: "Pausada", spend: "R$ 3.200", leads: 89, cpa: "R$ 35,96" },
    { name: "Performance Max", status: "Ativa", spend: "R$ 19.200", leads: 238, cpa: "R$ 80,67" },
  ];

  return (
    <div className="card-executive p-5 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <p className="kpi-label mb-4">Campanhas Ativas</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 text-left font-medium text-muted-foreground">Campanha</th>
              <th className="pb-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="pb-3 text-right font-medium text-muted-foreground">Investimento</th>
              <th className="pb-3 text-right font-medium text-muted-foreground">Leads</th>
              <th className="pb-3 text-right font-medium text-muted-foreground">CPA</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.name} className="border-b border-border/50 last:border-0">
                <td className="py-3 font-medium text-foreground">{c.name}</td>
                <td className="py-3">
                  <span className={c.status === "Ativa" ? "metric-badge-positive" : "metric-badge-negative"}>
                    {c.status}
                  </span>
                </td>
                <td className="py-3 text-right font-mono text-foreground">{c.spend}</td>
                <td className="py-3 text-right font-mono text-foreground">{c.leads}</td>
                <td className="py-3 text-right font-mono text-foreground">{c.cpa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
