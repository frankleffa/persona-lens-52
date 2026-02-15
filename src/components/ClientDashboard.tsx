import { useCallback, useEffect, useMemo, useState } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdsData, type DateRangeOption } from "@/hooks/useAdsData";
import { METRIC_DEFINITIONS, MOCK_METRIC_DATA, type MetricKey } from "@/lib/types";
import { useUserRole } from "@/hooks/useUserRole";
import KPICard from "@/components/KPICard";
import FunnelChart from "@/components/FunnelChart";
import CampaignTable from "@/components/CampaignTable";
import JourneyFunnelChart from "@/components/JourneyFunnelChart";
import PlatformSection from "@/components/PlatformSection";
import HourlyConversionsChart from "@/components/HourlyConversionsChart";
import { Loader2, RefreshCw, Settings2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const DATE_OPTIONS: { value: DateRangeOption; label: string }[] = [
  { value: "TODAY", label: "Hoje" },
  { value: "LAST_7_DAYS", label: "7 dias" },
  { value: "LAST_14_DAYS", label: "14 dias" },
  { value: "LAST_30_DAYS", label: "30 dias" },
];

interface ClientDashboardProps {
  clientId: string;
  clientName?: string;
  isDemo?: boolean;
}

const CONSOLIDATED_KPIS: MetricKey[] = ["investment", "revenue", "roas", "leads", "messages", "cpa"];
const CAMPAIGN_METRICS: MetricKey[] = ["campaign_names", "ad_sets"];
const ANALYSIS_METRICS: MetricKey[] = ["attribution_comparison", "discrepancy_percentage"];
const VIZ_METRICS: MetricKey[] = ["trend_charts", "funnel_visualization"];

// Map platform-level metric keys to visibility MetricKeys
const GOOGLE_METRIC_MAP: Record<string, MetricKey> = {
  investment: "investment", clicks: "cpc", impressions: "ctr",
  conversions: "leads", ctr: "ctr", cpc: "cpc", cpa: "cpa",
};

const META_METRIC_MAP: Record<string, MetricKey> = {
  investment: "investment", clicks: "cpc", impressions: "ctr",
  leads: "leads", ctr: "ctr", cpc: "cpc", cpa: "cpa",
};

const GA4_METRIC_MAP: Record<string, MetricKey> = {
  sessions: "sessions", events: "events", conversion_rate: "conversion_rate",
};

const GOOGLE_LABELS: Record<string, string> = {
  investment: "Investimento", clicks: "Cliques", impressions: "Impressões",
  conversions: "Conversões", ctr: "CTR", cpc: "CPC", cpa: "CPA",
};

const META_LABELS: Record<string, string> = {
  investment: "Investimento", clicks: "Cliques", impressions: "Impressões",
  leads: "Leads", ctr: "CTR", cpc: "CPC", cpa: "CPA",
};

const GA4_LABELS: Record<string, string> = {
  sessions: "Sessões", events: "Eventos", conversion_rate: "Taxa de Conversão",
};

export default function ClientDashboard({ clientId, clientName, isDemo }: ClientDashboardProps) {
  const { isMetricVisible, loadPermissionsForClient, togglePermission, savePermissions } = usePermissions();
  const { role } = useUserRole();
  const isManager = role === "admin" || role === "manager";
  const [showConsolidatedToggles, setShowConsolidatedToggles] = useState(false);

  useEffect(() => {
    if (clientId) loadPermissionsForClient(clientId);
  }, [clientId, loadPermissionsForClient]);

  // Auto-save permissions when toggles change (debounced)
  const visibilitySnapshot = CONSOLIDATED_KPIS.map((k) => isMetricVisible(clientId, k)).join(",");
  useEffect(() => {
    if (!showConsolidatedToggles || !clientId) return;
    const timer = setTimeout(() => { savePermissions(clientId); }, 500);
    return () => clearTimeout(timer);
  }, [visibilitySnapshot, showConsolidatedToggles, clientId, savePermissions]);

  const { metricData, campaigns, loading, googleAdsMetrics, metaAdsMetrics, ga4Metrics, refetch, dateRange, changeDateRange, data: rawData } = useAdsData(clientId);

  const visibleConsolidatedKPIs = useMemo(
    () => CONSOLIDATED_KPIS.filter((k) => {
      if (!isMetricVisible(clientId, k)) return false;
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
  const showFunnel = isMetricVisible(clientId, "funnel_visualization");

  // Filter platform metrics by visibility
  const filterPlatformMetrics = useCallback(
    (metrics: Record<string, any> | undefined, metricMap: Record<string, MetricKey>) => {
      if (!metrics) return undefined;
      const filtered: Record<string, any> = {};
      Object.entries(metrics).forEach(([key, value]) => {
        const visKey = metricMap[key];
        if (!visKey || isMetricVisible(clientId, visKey)) {
          filtered[key] = value;
        }
      });
      return Object.keys(filtered).length > 0 ? filtered : undefined;
    },
    [clientId, isMetricVisible]
  );

  const filteredGoogle = useMemo(() => filterPlatformMetrics(googleAdsMetrics, GOOGLE_METRIC_MAP), [googleAdsMetrics, filterPlatformMetrics]);
  const filteredMeta = useMemo(() => filterPlatformMetrics(metaAdsMetrics, META_METRIC_MAP), [metaAdsMetrics, filterPlatformMetrics]);
  const filteredGA4 = useMemo(() => filterPlatformMetrics(ga4Metrics, GA4_METRIC_MAP), [ga4Metrics, filterPlatformMetrics]);

  const hasContent = (metricData && (visibleConsolidatedKPIs.length > 0 || isManager)) || showCampaigns || showAttribution || showFunnel || filteredGoogle || filteredMeta || filteredGA4;

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
    <div className="space-y-6 lg:space-y-8">
      {clientName && (
        <div className="animate-fade-in flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {isDemo && (
              <span className="inline-flex items-center rounded-full border border-amber-300/50 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-400">
                Conta Demonstrativa
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5 overflow-x-auto">
              {DATE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => changeDateRange(opt.value)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
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
              className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* Métricas Gerais */}
      {metricData && (visibleConsolidatedKPIs.length > 0 || isManager) && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-muted-foreground bg-muted">
                Σ
              </div>
              <h3 className="text-lg font-semibold text-foreground">Métricas Gerais</h3>
            </div>
            {isManager && (
              <button
                onClick={() => setShowConsolidatedToggles((v) => !v)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {showConsolidatedToggles ? "Fechar" : "Configurar"}
              </button>
            )}
          </div>

          {/* Toggle panel */}
          {showConsolidatedToggles && isManager && (
            <div className="animate-fade-in rounded-lg border border-border bg-card p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Selecione as métricas visíveis:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CONSOLIDATED_KPIS.map((key) => {
                  const def = METRIC_DEFINITIONS.find((m) => m.key === key)!;
                  const visible = isMetricVisible(clientId, key);
                  return (
                    <label key={key} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors">
                      <span className="text-sm text-foreground">{def.label}</span>
                      <Switch
                        checked={visible}
                        onCheckedChange={() => {
                          togglePermission(clientId, key);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {visibleConsolidatedKPIs.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
              {visibleConsolidatedKPIs.map((key, i) => {
                const def = METRIC_DEFINITIONS.find((m) => m.key === key)!;
                return <KPICard key={key} metric={metricData[key]} label={def.label} delay={i * 60} metricKey={key} />;
              })}
            </div>
          )}
        </div>
      )}

      {/* Google Ads */}
      {filteredGoogle && (
        <PlatformSection title="Google Ads" icon="G" colorClass="text-chart-blue bg-chart-blue/15" metrics={filteredGoogle} metricLabels={GOOGLE_LABELS} />
      )}

      {/* Meta Ads */}
      {filteredMeta && (
        <PlatformSection title="Meta Ads" icon="M" colorClass="text-chart-purple bg-chart-purple/15" metrics={filteredMeta} metricLabels={META_LABELS} />
      )}

      {/* GA4 */}
      {filteredGA4 && (
        <PlatformSection title="Google Analytics 4" icon="A" colorClass="text-chart-amber bg-chart-amber/15" metrics={filteredGA4} metricLabels={GA4_LABELS} />
      )}

      {/* ROAS Gauge */}
      {showFunnel && metricData?.roas?.value && (
        <div className="max-w-sm">
          <FunnelChart roasValue={metricData.roas.value} />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4">
        <HourlyConversionsChart data={rawData?.hourly_conversions} />
      </div>

      {/* Campanhas e Funil */}
      <div className={`grid gap-4 grid-cols-1 ${showCampaigns && showAttribution ? "lg:grid-cols-2" : ""}`}>
        {showCampaigns && <CampaignTable campaigns={campaigns} />}
        {showAttribution && (
          <JourneyFunnelChart
            consolidated={rawData?.consolidated}
            googleAds={rawData?.google_ads}
            metaAds={rawData?.meta_ads}
            ga4={rawData?.ga4}
          />
        )}
      </div>
    </div>
  );
}
