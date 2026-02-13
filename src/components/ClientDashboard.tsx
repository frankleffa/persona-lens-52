import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdsData, type DateRangeOption } from "@/hooks/useAdsData";
import { METRIC_DEFINITIONS, MOCK_METRIC_DATA, type MetricKey } from "@/lib/types";
import KPICard from "@/components/KPICard";
import TrendChart from "@/components/TrendChart";
import FunnelChart from "@/components/FunnelChart";
import CampaignTable from "@/components/CampaignTable";
import AttributionChart from "@/components/AttributionChart";
import PlatformSection from "@/components/PlatformSection";
import HourlyConversionsChart from "@/components/HourlyConversionsChart";
import { Loader2, RefreshCw } from "lucide-react";

const DATE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "TODAY", label: "Hoje" },
  { value: "LAST_7_DAYS", label: "7 dias" },
  { value: "LAST_14_DAYS", label: "14 dias" },
  { value: "LAST_30_DAYS", label: "30 dias" },
];

interface ClientDashboardProps {
  clientId: string;
  clientName?: string;
}

const CONSOLIDATED_KPIS: MetricKey[] = ["investment", "revenue", "roas", "leads", "messages", "cpa"];
const CAMPAIGN_METRICS: MetricKey[] = ["campaign_names", "ad_sets"];
const ANALYSIS_METRICS: MetricKey[] = ["attribution_comparison", "discrepancy_percentage"];
const VIZ_METRICS: MetricKey[] = ["trend_charts", "funnel_visualization"];

const GOOGLE_LABELS: Record<string, string> = {
  investment: "Investimento",
  clicks: "Cliques",
  impressions: "Impressões",
  conversions: "Conversões",
  ctr: "CTR",
  cpc: "CPC",
  cpa: "CPA",
};

const META_LABELS: Record<string, string> = {
  investment: "Investimento",
  clicks: "Cliques",
  impressions: "Impressões",
  leads: "Leads",
  ctr: "CTR",
  cpc: "CPC",
  cpa: "CPA",
};

const GA4_LABELS: Record<string, string> = {
  sessions: "Sessões",
  events: "Eventos",
  conversion_rate: "Taxa de Conversão",
};

export default function ClientDashboard({ clientId, clientName }: ClientDashboardProps) {
  const { isMetricVisible } = usePermissions();
  const { metricData, campaigns, loading, googleAdsMetrics, metaAdsMetrics, ga4Metrics, refetch, dateRange, changeDateRange, data: rawData } = useAdsData();

  const visibleConsolidatedKPIs = useMemo(
    () => CONSOLIDATED_KPIS.filter((k) => {
      if (!isMetricVisible(clientId, k)) return false;
      // Auto-hide messages KPI when there are no messages
      if (k === "messages" && metricData) {
        const msgVal = parseInt(metricData.messages?.value?.replace(/\./g, "") || "0");
        if (msgVal === 0) return false;
      }
      return true;
    }),
    [clientId, isMetricVisible, metricData]
  );

  const showCampaigns = CAMPAIGN_METRICS.some((k) => isMetricVisible(clientId, k));
  const showAttribution = ANALYSIS_METRICS.some((k) => isMetricVisible(clientId, k));
  const showTrend = isMetricVisible(clientId, "trend_charts");
  const showFunnel = isMetricVisible(clientId, "funnel_visualization");

  const hasContent = (metricData && visibleConsolidatedKPIs.length > 0) || showCampaigns || showAttribution || showTrend || showFunnel || googleAdsMetrics || metaAdsMetrics || ga4Metrics;

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!hasContent) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium text-muted-foreground">Nenhum dado disponível</p>
          <p className="mt-1 text-sm text-muted-foreground">Conecte suas plataformas e selecione contas ativas para visualizar métricas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {clientName && (
        <div className="animate-fade-in flex items-center justify-between">
          <div />
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => changeDateRange(opt.value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    dateRange === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* Seção 1 – Consolidado Executivo */}
      {metricData && visibleConsolidatedKPIs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-muted-foreground bg-muted">
              Σ
            </div>
            <h3 className="text-lg font-semibold text-foreground">Consolidado Executivo</h3>
          </div>
          <div className="grid gap-4" style={{
            gridTemplateColumns: `repeat(${Math.min(visibleConsolidatedKPIs.length, 5)}, minmax(0, 1fr))`
          }}>
            {visibleConsolidatedKPIs.map((key, i) => {
              const def = METRIC_DEFINITIONS.find((m) => m.key === key)!;
              return <KPICard key={key} metric={metricData[key]} label={def.label} delay={i * 60} metricKey={key} />;
            })}
          </div>
        </div>
      )}

      {/* Seção 2 – Google Ads */}
      {googleAdsMetrics && (
        <PlatformSection
          title="Google Ads"
          icon="G"
          colorClass="text-chart-blue bg-chart-blue/15"
          metrics={googleAdsMetrics}
          metricLabels={GOOGLE_LABELS}
        />
      )}

      {/* Seção 3 – Meta Ads */}
      {metaAdsMetrics && (
        <PlatformSection
          title="Meta Ads"
          icon="M"
          colorClass="text-chart-purple bg-chart-purple/15"
          metrics={metaAdsMetrics}
          metricLabels={META_LABELS}
        />
      )}

      {/* Seção 4 – Google Analytics 4 */}
      {ga4Metrics && (
        <PlatformSection
          title="Google Analytics 4"
          icon="A"
          colorClass="text-chart-amber bg-chart-amber/15"
          metrics={ga4Metrics}
          metricLabels={GA4_LABELS}
        />
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-3 gap-4">
        {showTrend && <div className="col-span-2"><TrendChart /></div>}
        {!showTrend && <div className="col-span-2" />}
        <div className="col-span-1 flex flex-col gap-4">
          {showFunnel && <FunnelChart roasValue={metricData?.roas?.value} />}
          <HourlyConversionsChart data={rawData?.hourly_conversions} />
        </div>
      </div>

      {/* Campanhas e Atribuição */}
      <div className={`grid gap-4 ${showCampaigns && showAttribution ? "grid-cols-2" : "grid-cols-1"}`}>
        {showCampaigns && <CampaignTable campaigns={campaigns} />}
        {showAttribution && <AttributionChart />}
      </div>
    </div>
  );
}
