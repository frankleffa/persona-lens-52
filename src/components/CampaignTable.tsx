import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { MetricKey } from "@/lib/types";
import { CampaignActions } from "@/components/campaigns/CampaignActions";

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
  followers?: number;
  profile_visits?: number;
  cpa: number;
  source?: string;
  adset_count?: number;
  ad_count?: number;
  external_campaign_id?: string;
}

export type CampaignColumnKey = "camp_investment" | "camp_result" | "camp_cpa" | "camp_cpc" | "camp_clicks" | "camp_impressions" | "camp_ctr" | "camp_revenue" | "camp_messages" | "camp_purchases" | "camp_registrations" | "camp_cost_per_purchase" | "camp_cost_per_registration" | "camp_profile_visits" | "camp_followers";

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
  { key: "camp_cost_per_purchase", label: "Custo/Compra", shortLabel: "C/Compra" },
  { key: "camp_cost_per_registration", label: "Custo/Cadastro", shortLabel: "C/Cadastro" },
  { key: "camp_profile_visits", label: "Visitas ao Perfil", shortLabel: "Visitas" },
  { key: "camp_followers", label: "Novos Seguidores", shortLabel: "Seguidor." },
];

// Default visible columns
const DEFAULT_VISIBLE: CampaignColumnKey[] = ["camp_investment", "camp_result", "camp_purchases", "camp_registrations", "camp_cpa", "camp_cpc", "camp_clicks"];

const PAGE_SIZE = 10;

interface CampaignTableProps {
  campaigns?: Campaign[] | null;
  isManager?: boolean;
  clientId?: string;
  visibleColumns?: (metricKey: MetricKey) => boolean;
  onToggleColumn?: (metricKey: MetricKey) => void;
}

export default function CampaignTable({ campaigns, isManager, clientId, visibleColumns, onToggleColumn }: CampaignTableProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [page, setPage] = useState(0);

  const isColVisible = (key: CampaignColumnKey) => {
    if (visibleColumns) return visibleColumns(key as MetricKey);
    return DEFAULT_VISIBLE.includes(key);
  };

  const activeCols = CAMPAIGN_COLUMNS.filter((c) => isColVisible(c.key));

  // Pagination
  const totalItems = campaigns?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const paginatedCampaigns = useMemo(() => {
    if (!campaigns) return [];
    const start = page * PAGE_SIZE;
    return campaigns.slice(start, start + PAGE_SIZE);
  }, [campaigns, page]);

  // Reset page when campaigns change
  useMemo(() => setPage(0), [totalItems]);

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
        <div className="flex items-center gap-2">
          {totalPages > 1 && (
            <span className="text-xs text-muted-foreground">
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalItems)} de {totalItems}
            </span>
          )}
          {isManager && onToggleColumn && (
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {showSettings ? "Fechar" : "Colunas"}
            </button>
          )}
        </div>
      </div>

      {/* Column toggle panel */}
      {showSettings && isManager && onToggleColumn && (
        <div className="animate-fade-in rounded-lg bg-card p-4 space-y-3 mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Selecione as colunas visíveis:</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CAMPAIGN_COLUMNS.map((col) => (
              <label key={col.key} className="flex items-center justify-between gap-2 rounded-md px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
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
            <tr>
              <th className="pb-3 pr-4 text-left font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Campanha</th>
              <th className="pb-3 px-4 text-left font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Origem</th>
              {activeCols.map((col) => (
                <th key={col.key} className="pb-3 px-4 text-right font-semibold text-muted-foreground text-[10px] uppercase tracking-wider whitespace-nowrap">
                  {col.shortLabel}
                </th>
              ))}
              {isManager && clientId && (
                <th className="pb-3 px-2 text-center font-semibold text-muted-foreground text-[10px] uppercase tracking-wider w-12">
                  Ações
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedCampaigns.map((c, i) => {
              const hasMessages = (c.messages || 0) > 0;
              const resultValue = hasMessages ? c.messages! : (c.leads || c.conversions || 0);
              const resultLabel = hasMessages ? "msgs" : "leads";
              const impressions = 0;
              const ctr = 0;

              return (
                <tr key={`${c.name}-${page}-${i}`} className="hover:bg-primary/5 transition-colors" style={{ minHeight: 48 }}>
                  <td className="py-3 px-0 pr-4 font-medium text-[13px] text-foreground max-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="truncate">{c.name}</span>
                      {((c.adset_count != null && c.adset_count > 0) || (c.ad_count != null && c.ad_count > 0)) && (
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                          {c.adset_count || 0} {(c.adset_count || 0) === 1 ? "conjunto" : "conjuntos"} · {c.ad_count || 0} {(c.ad_count || 0) === 1 ? "anúncio" : "anúncios"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide ${c.source === "Google Ads" ? "bg-chart-blue/15 text-chart-blue" :
                        c.source === "Meta Ads" ? "badge-meta" :
                          "bg-muted text-muted-foreground"
                      }`}>
                      {c.source || "—"}
                    </span>
                  </td>
                  {activeCols.map((col) => (
                    <td key={col.key} className="py-3 px-4 text-right font-mono text-foreground whitespace-nowrap text-[13px]">
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
                      {col.key === "camp_cost_per_purchase" && (c.purchases && c.purchases > 0 ? `R$ ${(c.spend / c.purchases).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—")}
                      {col.key === "camp_cost_per_registration" && (c.registrations && c.registrations > 0 ? `R$ ${(c.spend / c.registrations).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—")}
                      {col.key === "camp_profile_visits" && (c.profile_visits || 0).toLocaleString("pt-BR")}
                      {col.key === "camp_followers" && (c.followers || 0).toLocaleString("pt-BR")}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4 pt-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs font-medium text-muted-foreground tabular-nums">
            {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
