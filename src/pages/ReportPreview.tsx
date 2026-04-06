import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";

/* ───── types ───── */
interface SectionsSnapshot {
  sections: string[];
  order: string[];
  custom_title: string;
  custom_subtitle: string;
  template_id: string;
  selected_kpis?: string[];
  selected_campaign_columns?: string[];
}

const ALL_KPIS = ["spend", "revenue", "roas", "conversions", "clicks", "impressions", "cpa"];
const ALL_COLUMNS = ["spend", "revenue", "conversions", "clicks", "impressions", "cpa"];

interface ReportInstance {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  template_id: string;
  sections_snapshot: SectionsSnapshot;
  notes: string | null;
  generated_at: string;
  sent: boolean;
}

interface AggregatedMetrics {
  spend: number;
  revenue: number;
  conversions: number;
  clicks: number;
  impressions: number;
  roas: number;
}

interface CampaignRow {
  campaign_name: string;
  spend: number;
  revenue: number;
  conversions: number;
  clicks: number;
  impressions: number;
  cpa: number;
}

interface PeriodComparison {
  current: AggregatedMetrics;
  previous: AggregatedMetrics;
  changes: Record<keyof AggregatedMetrics, number>;
}

/* ───── helpers ───── */
function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(v: number) {
  return v.toLocaleString("pt-BR");
}

/* ───── sub-components ───── */

function ReportHeader({ snapshot, periodStart, periodEnd, generatedAt }: {
  snapshot: SectionsSnapshot;
  periodStart: string;
  periodEnd: string;
  generatedAt: string;
}) {
  return (
    <header className="mb-8 border-b-2 border-blue-600 pb-6">
      <h1 className="text-2xl font-bold text-gray-900">
        {snapshot.custom_title || "Relatório de Performance"}
      </h1>
      {snapshot.custom_subtitle && (
        <p className="text-base text-gray-500 mt-1">{snapshot.custom_subtitle}</p>
      )}
      <div className="flex flex-wrap gap-6 mt-4 text-sm text-gray-500">
        <span>
          Período: {format(new Date(periodStart), "dd/MM/yyyy", { locale: ptBR })} — {format(new Date(periodEnd), "dd/MM/yyyy", { locale: ptBR })}
        </span>
        <span>
          Gerado em: {format(new Date(generatedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </span>
      </div>
    </header>
  );
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="flex items-center gap-1 text-xs text-gray-400"><Minus className="h-3 w-3" /> 0%</span>;
  const isUp = value > 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${isUp ? "text-emerald-600" : "text-red-500"}`}>
      {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isUp ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

function MetricCards({ comparison, selectedKpis }: { comparison: PeriodComparison; selectedKpis: string[] }) {
  const allCards = [
    { key: "spend", label: "Investimento", value: formatCurrency(comparison.current.spend), change: comparison.changes.spend },
    { key: "revenue", label: "Receita", value: formatCurrency(comparison.current.revenue), change: comparison.changes.revenue },
    { key: "roas", label: "ROAS", value: `${comparison.current.roas.toFixed(2)}x`, change: comparison.changes.roas },
    { key: "conversions", label: "Conversões", value: formatNumber(comparison.current.conversions), change: comparison.changes.conversions },
    { key: "clicks", label: "Cliques", value: formatNumber(comparison.current.clicks), change: comparison.changes.clicks },
    { key: "impressions", label: "Impressões", value: formatNumber(comparison.current.impressions), change: comparison.changes.impressions },
    { key: "cpa", label: "CPA", value: comparison.current.conversions > 0 ? formatCurrency(comparison.current.spend / comparison.current.conversions) : "—", change: 0 },
  ];
  const cards = allCards.filter((c) => selectedKpis.includes(c.key));

  if (cards.length === 0) return null;

  const cols = cards.length <= 3 ? `grid-cols-${cards.length}` : cards.length === 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <section className={`grid ${cols} gap-4 mb-8`}>
      {cards.map((c) => (
        <div key={c.key} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{c.label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{c.value}</p>
          <ChangeIndicator value={c.change} />
        </div>
      ))}
    </section>
  );
}

function SectionSummary({ comparison, selectedKpis }: { comparison: PeriodComparison; selectedKpis: string[] }) {
  const allRows = [
    { key: "spend", text: "Total investido", value: formatCurrency(comparison.current.spend) },
    { key: "revenue", text: "Receita gerada", value: formatCurrency(comparison.current.revenue) },
    { key: "roas", text: "ROAS", value: `${comparison.current.roas.toFixed(2)}x` },
    { key: "conversions", text: "Conversões", value: formatNumber(comparison.current.conversions) },
    { key: "clicks", text: "Cliques", value: formatNumber(comparison.current.clicks) },
    { key: "impressions", text: "Impressões", value: formatNumber(comparison.current.impressions) },
    { key: "cpa", text: "CPA", value: comparison.current.conversions > 0 ? formatCurrency(comparison.current.spend / comparison.current.conversions) : "—" },
  ];
  const rows = allRows.filter((r) => selectedKpis.includes(r.key));

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Resumo do Período</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
        <div className="space-y-2">
          {rows.slice(0, Math.ceil(rows.length / 2)).map((r) => (
            <p key={r.key}>{r.text}: <strong>{r.value}</strong></p>
          ))}
        </div>
        <div className="space-y-2">
          {rows.slice(Math.ceil(rows.length / 2)).map((r) => (
            <p key={r.key}>{r.text}: <strong>{r.value}</strong></p>
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionComparison({ comparison, selectedKpis }: { comparison: PeriodComparison; selectedKpis: string[] }) {
  const allRows = [
    { key: "spend", label: "Investimento", curr: formatCurrency(comparison.current.spend), prev: formatCurrency(comparison.previous.spend), change: comparison.changes.spend },
    { key: "revenue", label: "Receita", curr: formatCurrency(comparison.current.revenue), prev: formatCurrency(comparison.previous.revenue), change: comparison.changes.revenue },
    { key: "roas", label: "ROAS", curr: `${comparison.current.roas.toFixed(2)}x`, prev: `${comparison.previous.roas.toFixed(2)}x`, change: comparison.changes.roas },
    { key: "conversions", label: "Conversões", curr: formatNumber(comparison.current.conversions), prev: formatNumber(comparison.previous.conversions), change: comparison.changes.conversions },
    { key: "clicks", label: "Cliques", curr: formatNumber(comparison.current.clicks), prev: formatNumber(comparison.previous.clicks), change: comparison.changes.clicks },
    { key: "impressions", label: "Impressões", curr: formatNumber(comparison.current.impressions), prev: formatNumber(comparison.previous.impressions), change: comparison.changes.impressions },
  ];
  const rows = allRows.filter((r) => selectedKpis.includes(r.key));

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Comparativo com Período Anterior</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 font-medium">Métrica</th>
            <th className="py-2 font-medium text-right">Atual</th>
            <th className="py-2 font-medium text-right">Anterior</th>
            <th className="py-2 font-medium text-right">Variação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-gray-100">
              <td className="py-2 text-gray-700">{r.label}</td>
              <td className="py-2 text-right font-medium text-gray-900">{r.curr}</td>
              <td className="py-2 text-right text-gray-500">{r.prev}</td>
              <td className="py-2 text-right"><ChangeIndicator value={r.change} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function SectionTopCampaigns({ campaigns, selectedColumns }: { campaigns: CampaignRow[]; selectedColumns: string[] }) {
  const top = [...campaigns].sort((a, b) => b.spend - a.spend).slice(0, 5);

  const colDefs = [
    { key: "revenue", label: "Receita", render: (c: CampaignRow) => formatCurrency(c.revenue) },
    { key: "spend", label: "Invest.", render: (c: CampaignRow) => formatCurrency(c.spend) },
    { key: "conversions", label: "Conv.", render: (c: CampaignRow) => formatNumber(c.conversions) },
    { key: "clicks", label: "Cliques", render: (c: CampaignRow) => formatNumber(c.clicks) },
    { key: "impressions", label: "Impr.", render: (c: CampaignRow) => formatNumber(c.impressions) },
    { key: "cpa", label: "CPA", render: (c: CampaignRow) => c.conversions > 0 ? formatCurrency(c.spend / c.conversions) : "—" },
  ];
  const cols = colDefs.filter((d) => selectedColumns.includes(d.key));

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Top Campanhas</h2>
      {top.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma campanha encontrada no período.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 font-medium">Campanha</th>
              {cols.map((d) => <th key={d.key} className="py-2 font-medium text-right">{d.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {top.map((c, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 text-gray-700 max-w-[200px] truncate">{c.campaign_name}</td>
                {cols.map((d) => <td key={d.key} className="py-2 text-right text-gray-500">{d.render(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SectionCampaignTable({ campaigns, selectedColumns }: { campaigns: CampaignRow[]; selectedColumns: string[] }) {
  const colDefs = [
    { key: "spend", label: "Invest.", render: (c: CampaignRow) => formatCurrency(c.spend) },
    { key: "revenue", label: "Receita", render: (c: CampaignRow) => formatCurrency(c.revenue), bold: true },
    { key: "conversions", label: "Conv.", render: (c: CampaignRow) => formatNumber(c.conversions) },
    { key: "clicks", label: "Cliques", render: (c: CampaignRow) => formatNumber(c.clicks) },
    { key: "impressions", label: "Impr.", render: (c: CampaignRow) => formatNumber(c.impressions) },
    { key: "cpa", label: "CPA", render: (c: CampaignRow) => c.conversions > 0 ? formatCurrency(c.spend / c.conversions) : "—" },
  ];
  const cols = colDefs.filter((d) => selectedColumns.includes(d.key));

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Tabela de Campanhas</h2>
      {campaigns.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma campanha encontrada no período.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 font-medium">Campanha</th>
              {cols.map((d) => <th key={d.key} className="py-2 font-medium text-right">{d.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-2 text-gray-700 max-w-[180px] truncate">{c.campaign_name}</td>
                {cols.map((d) => <td key={d.key} className={`py-2 text-right ${d.bold ? "font-medium text-gray-900" : "text-gray-500"}`}>{d.render(c)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function SectionNotes({ notes }: { notes: string | null }) {
  if (!notes) return null;
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Notas Importantes</h2>
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {notes}
      </div>
    </section>
  );
}

function SectionRecommendations({ comparison }: { comparison: PeriodComparison }) {
  const recs: string[] = [];
  if (comparison.current.roas < 1) recs.push("O ROAS está abaixo de 1x. Considere revisar a segmentação e criativos das campanhas.");
  if (comparison.changes.spend > 20 && comparison.changes.revenue < 5) recs.push("O investimento cresceu significativamente mas a receita não acompanhou. Avalie a eficiência das campanhas.");
  if (comparison.changes.conversions < 0) recs.push("As conversões caíram em relação ao período anterior. Analise possíveis causas como sazonalidade ou mudanças de público.");
  if (recs.length === 0) recs.push("Performance estável. Continue monitorando os indicadores e otimizando os criativos.");

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">Recomendações</h2>
      <ul className="space-y-2 text-sm text-gray-700">
        {recs.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-blue-600 font-bold mt-px">•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───── aggregation helper ───── */
async function fetchAggregated(clientId: string, start: string, end: string): Promise<{ metrics: AggregatedMetrics; campaigns: CampaignRow[] }> {
  const { data, error } = await supabase
    .from("daily_campaigns")
    .select("campaign_name, spend, revenue, conversions, clicks, cpa")
    .eq("client_id", clientId)
    .gte("date", start)
    .lte("date", end);

  if (error || !data) return { metrics: { spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, roas: 0 }, campaigns: [] };
  
  const rows = data as unknown as Array<{ campaign_name: string; spend: number | null; revenue: number | null; conversions: number | null; clicks: number | null; cpa: number | null }>;

  const totalSpend = rows.reduce((s, r) => s + (Number(r.spend) || 0), 0);
  const totalRevenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
  const totalConversions = rows.reduce((s, r) => s + (Number(r.conversions) || 0), 0);
  const totalClicks = rows.reduce((s, r) => s + (Number(r.clicks) || 0), 0);
  const totalImpressions = 0;

  // Aggregate by campaign name
  const campMap = new Map<string, CampaignRow>();
  for (const r of rows) {
    const existing = campMap.get(r.campaign_name) || { campaign_name: r.campaign_name, spend: 0, revenue: 0, conversions: 0, clicks: 0, impressions: 0, cpa: 0 };
    existing.spend += Number(r.spend) || 0;
    existing.revenue += Number(r.revenue) || 0;
    existing.conversions += Number(r.conversions) || 0;
    existing.clicks += Number(r.clicks) || 0;
    campMap.set(r.campaign_name, existing);
  }
  const campaigns = Array.from(campMap.values()).map((c) => ({
    ...c,
    cpa: c.conversions > 0 ? c.spend / c.conversions : 0,
  }));

  return {
    metrics: {
      spend: totalSpend,
      revenue: totalRevenue,
      conversions: totalConversions,
      clicks: totalClicks,
      impressions: totalImpressions,
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
    },
    campaigns,
  };
}

/* ───── main component ───── */
export default function ReportPreview() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ReportInstance | null>(null);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    async function load() {
      setLoading(true);
      // Fetch report instance
      const { data: inst, error: instErr } = await supabase
        .from("report_instances")
        .select("*")
        .eq("id", reportId!)
        .single();

      if (instErr || !inst) {
        setError("Relatório não encontrado.");
        setLoading(false);
        return;
      }

      const reportData = inst as unknown as ReportInstance;
      setReport(reportData);

      // Calculate previous period
      const start = new Date(reportData.period_start);
      const end = new Date(reportData.period_end);
      const days = differenceInDays(end, start) + 1;
      const prevEnd = subDays(start, 1);
      const prevStart = subDays(prevEnd, days - 1);

      const [current, previous] = await Promise.all([
        fetchAggregated(reportData.client_id, reportData.period_start, reportData.period_end),
        fetchAggregated(reportData.client_id, format(prevStart, "yyyy-MM-dd"), format(prevEnd, "yyyy-MM-dd")),
      ]);

      setCampaigns(current.campaigns);
      setComparison({
        current: current.metrics,
        previous: previous.metrics,
        changes: {
          spend: pctChange(current.metrics.spend, previous.metrics.spend),
          revenue: pctChange(current.metrics.revenue, previous.metrics.revenue),
          roas: pctChange(current.metrics.roas, previous.metrics.roas),
          conversions: pctChange(current.metrics.conversions, previous.metrics.conversions),
          clicks: pctChange(current.metrics.clicks, previous.metrics.clicks),
          impressions: pctChange(current.metrics.impressions, previous.metrics.impressions),
        },
      });

      setLoading(false);
    }

    load();
  }, [reportId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !report || !comparison) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || "Erro ao carregar relatório."}</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 underline text-sm">Voltar</button>
      </div>
    );
  }

  const snapshot = report.sections_snapshot;
  const enabledSections = snapshot.sections || [];
  const sectionOrder = snapshot.order || enabledSections;
  const activeSections = sectionOrder.filter((s) => enabledSections.includes(s));

  // Fallback: if no metric selection saved, show all (backward compat)
  const selectedKpis = snapshot.selected_kpis || ALL_KPIS;
  const selectedColumns = snapshot.selected_campaign_columns || ALL_COLUMNS;

  function renderSection(key: string) {
    switch (key) {
      case "show_summary":
        return <SectionSummary key={key} comparison={comparison!} selectedKpis={selectedKpis} />;
      case "show_comparison":
        return <SectionComparison key={key} comparison={comparison!} selectedKpis={selectedKpis} />;
      case "show_top_campaigns":
        return <SectionTopCampaigns key={key} campaigns={campaigns} selectedColumns={selectedColumns} />;
      case "show_campaign_table":
        return <SectionCampaignTable key={key} campaigns={campaigns} selectedColumns={selectedColumns} />;
      case "show_notes":
        return <SectionNotes key={key} notes={report!.notes} />;
      case "show_recommendations":
        return <SectionRecommendations key={key} comparison={comparison!} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 report-preview-root">
      {/* Toolbar */}
      <div className="no-print bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[210mm] mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Download className="h-4 w-4" />
            Baixar PDF
          </button>
        </div>
      </div>

      {/* Report Container */}
      <div className="report-container bg-white max-w-[210mm] mx-auto my-6 shadow-lg print:shadow-none print:my-0">
        <div className="p-8 md:p-12 print:p-0">
          <ReportHeader
            snapshot={snapshot}
            periodStart={report.period_start}
            periodEnd={report.period_end}
            generatedAt={report.generated_at}
          />

          <MetricCards comparison={comparison} selectedKpis={selectedKpis} />

          {activeSections.map((sectionKey) => renderSection(sectionKey))}

          {/* Footer */}
          <footer className="mt-12 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
            Relatório gerado automaticamente • {format(new Date(report.generated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </footer>
        </div>
      </div>
    </div>
  );
}
