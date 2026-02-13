interface Campaign {
  name: string;
  status: string;
  spend: number;
  leads?: number;
  clicks?: number;
  conversions?: number;
  messages?: number;
  revenue?: number;
  cpa: number;
  source?: string;
}

export default function CampaignTable({ campaigns }: { campaigns?: Campaign[] | null }) {
  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "250ms" }}>
        <p className="kpi-label mb-5">Campanhas Ativas</p>
        <p className="text-sm text-muted-foreground">Nenhuma campanha ativa no momento.</p>
      </div>
    );
  }

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <p className="kpi-label mb-5">Campanhas Ativas</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Campanha</th>
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Origem</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Investimento</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">Resultado</th>
              <th className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider">CPA</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              // Determine result: messages > leads > conversions
              const hasMessages = (c.messages || 0) > 0;
              const resultValue = hasMessages
                ? c.messages!
                : (c.leads || c.conversions || 0);
              const resultLabel = hasMessages ? "msgs" : "leads";

              return (
                <tr key={`${c.name}-${i}`} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
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
                  <td className="py-3.5 text-right font-mono text-foreground">
                    R$ {c.spend.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </td>
                  <td className="py-3.5 text-right font-mono text-foreground">
                    {resultValue} <span className="text-[10px] text-muted-foreground">{resultLabel}</span>
                  </td>
                  <td className="py-3.5 text-right font-mono text-foreground">
                    R$ {c.cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
