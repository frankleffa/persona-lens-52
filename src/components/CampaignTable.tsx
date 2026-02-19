import { useState } from "react";
import { Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { MetricKey } from "@/lib/types";

interface Campaign {
  name: string;
  status: string;
  spend: number;
  leads?: number;
  clicks?: number;
  conversions?: number;
  messages?: number;
  purchases?: number;
  registrations?: number;
  revenue?: number;
  cpa: number;
  source?: string;
}

export type CampaignColumnKey = "camp_investment" | "camp_result" | "camp_cpa" | "camp_cpc" | "camp_clicks" | "camp_impressions" | "camp_ctr" | "camp_revenue" | "camp_messages" | "camp_purchases" | "camp_registrations";

const CAMPAIGN_COLUMNS: { key: CampaignColumnKey; label: string; shortLabel: string }[] = [
  { key: "camp_investment", label: "Investimento", shortLabel: "Invest." },
  { key: "camp_result", label: "Resultado", shortLabel: "Result." },
  { key: "camp_purchases", label: "Compras", shortLabel: "Compras" },
  { key: "camp_registrations", label: "Cadastros", shortLabel: "Cadastros" },
  { key: "camp_cpa", label: "CPA", shortLabel: "CPA" },
  { key: "camp_cpc", label: "CPC", shortLabel: "CPC" },
  { key: "camp_clicks", label: "Cliques", shortLabel: "Cliques" },
  { key: "camp_impressions", label: "Impressões", shortLabel: "Impr." },
  { key: "camp_ctr", label: "CTR", shortLabel: "CTR" },
  { key: "camp_revenue", label: "Receita", shortLabel: "Receita" },
  { key: "camp_messages", label: "Mensagens", shortLabel: "Msgs" },
];

// Default visible columns — show more by default now
const DEFAULT_VISIBLE: CampaignColumnKey[] = ["camp_investment", "camp_result", "camp_cpa", "camp_cpc", "camp_clicks", "camp_impressions", "camp_ctr"];

interface CampaignTableProps {
  campaigns?: Campaign[] | null;
  isManager?: boolean;
  visibleColumns?: (metricKey: MetricKey) => boolean;
  onToggleColumn?: (metricKey: MetricKey) => void;
}

export default function CampaignTable({ campaigns, isManager, visibleColumns, onToggleColumn }: CampaignTableProps) {
  const [showSettings, setShowSettings] = useState(false);

  const isColVisible = (key: CampaignColumnKey) => {
    if (visibleColumns) return visibleColumns(key as MetricKey);
    return DEFAULT_VISIBLE.includes(key);
  };

  const activeCols = CAMPAIGN_COLUMNS.filter((c) => isColVisible(c.key));

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
      <div className="flex items-center justify-between mb-5">
        <p className="kpi-label">Campanhas Ativas</p>
        {isManager && onToggleColumn && (
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {showSettings ? "Fechar" : "Colunas"}
          </button>
        )}
      </div>

      {/* Column toggle panel */}
      {showSettings && isManager && onToggleColumn && (
        <div className="animate-fade-in rounded-lg border border-border bg-card p-4 space-y-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Selecione as colunas visíveis:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CAMPAIGN_COLUMNS.map((col) => (
              <label key={col.key} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                <span className="text-xs text-foreground">{col.label}</span>
                <Switch
                  checked={isColVisible(col.key)}
                  onCheckedChange={() => onToggleColumn(col.key as MetricKey)}
                />
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Campanha</th>
              <th className="pb-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wider">Origem</th>
              {activeCols.map((col) => (
                <th key={col.key} className="pb-3 text-right font-semibold text-muted-foreground text-xs uppercase tracking-wider whitespace-nowrap">
                  {col.shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => {
              const hasMessages = (c.messages || 0) > 0;
              const resultValue = hasMessages ? c.messages! : (c.leads || c.conversions || 0);
              const resultLabel = hasMessages ? "msgs" : "leads";
              const impressions = 0; // Not available in current data
              const ctr = 0;

              return (
                <tr key={`${c.name}-${i}`} className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-3.5 font-medium text-foreground max-w-[200px] truncate">{c.name}</td>
                  <td className="py-3.5">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${
                      c.source === "Google Ads" ? "bg-chart-blue/15 text-chart-blue" :
                      c.source === "Meta Ads" ? "bg-chart-purple/15 text-chart-purple" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {c.source || "—"}
                    </span>
                  </td>
                  {activeCols.map((col) => (
                    <td key={col.key} className="py-3.5 text-right font-mono text-foreground whitespace-nowrap">
                      {col.key === "camp_investment" && `R$ ${c.spend.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
                      {col.key === "camp_result" && (
                        <>{resultValue} <span className="text-[10px] text-muted-foreground">{resultLabel}</span></>
                      )}
                      {col.key === "camp_purchases" && (c.purchases || 0).toLocaleString("pt-BR")}
                      {col.key === "camp_registrations" && (c.registrations || 0).toLocaleString("pt-BR")}
                      {col.key === "camp_cpa" && `R$ ${c.cpa.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      {col.key === "camp_cpc" && `R$ ${(c.clicks && c.clicks > 0 ? c.spend / c.clicks : 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
                      {col.key === "camp_clicks" && (c.clicks || 0).toLocaleString("pt-BR")}
                      {col.key === "camp_impressions" && impressions.toLocaleString("pt-BR")}
                      {col.key === "camp_ctr" && `${ctr.toFixed(2)}%`}
                      {col.key === "camp_revenue" && `R$ ${(c.revenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
                      {col.key === "camp_messages" && (c.messages || 0).toLocaleString("pt-BR")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
