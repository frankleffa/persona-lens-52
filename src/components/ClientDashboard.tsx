import { useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAdsData } from "@/hooks/useAdsData";
import { METRIC_DEFINITIONS, MOCK_METRIC_DATA, type MetricKey } from "@/lib/types";
import KPICard from "@/components/KPICard";
import TrendChart from "@/components/TrendChart";
import FunnelChart from "@/components/FunnelChart";
import CampaignTable from "@/components/CampaignTable";
import AttributionChart from "@/components/AttributionChart";
import { Loader2 } from "lucide-react";

interface ClientDashboardProps {
  clientId: string;
  clientName?: string;
}

const KPI_METRICS: MetricKey[] = ["investment", "revenue", "roas", "leads", "cpa", "ctr", "cpc", "conversion_rate", "sessions", "events"];
const CAMPAIGN_METRICS: MetricKey[] = ["campaign_names", "ad_sets"];
const ANALYSIS_METRICS: MetricKey[] = ["attribution_comparison", "discrepancy_percentage"];
const VIZ_METRICS: MetricKey[] = ["trend_charts", "funnel_visualization"];

export default function ClientDashboard({ clientId, clientName }: ClientDashboardProps) {
  const { isMetricVisible } = usePermissions();
  const { metricData, campaigns, loading, usingMock } = useAdsData();

  const visibleKPIs = useMemo(
    () => KPI_METRICS.filter((k) => isMetricVisible(clientId, k)),
    [clientId, isMetricVisible]
  );

  const showCampaigns = CAMPAIGN_METRICS.some((k) => isMetricVisible(clientId, k));
  const showAttribution = ANALYSIS_METRICS.some((k) => isMetricVisible(clientId, k));
  const showTrend = isMetricVisible(clientId, "trend_charts");
  const showFunnel = isMetricVisible(clientId, "funnel_visualization");

  const hasContent = visibleKPIs.length > 0 || showCampaigns || showAttribution || showTrend || showFunnel;

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
          <p className="text-lg font-medium text-muted-foreground">Nenhuma métrica configurada</p>
          <p className="mt-1 text-sm text-muted-foreground">O gestor precisa ativar métricas para este cliente.</p>
        </div>
      </div>
    );
  }

  const topKPIs = visibleKPIs.slice(0, 5);
  const bottomKPIs = visibleKPIs.slice(5);

  return (
    <div className="space-y-6">
      {clientName && (
        <div className="animate-fade-in flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{clientName}</h2>
            <p className="text-sm text-muted-foreground">Visão executiva de performance</p>
          </div>
          {usingMock && (
            <span className="rounded-lg bg-chart-amber/15 px-3 py-1.5 text-xs font-medium text-chart-amber">
              Dados de demonstração
            </span>
          )}
        </div>
      )}

      {topKPIs.length > 0 && (
        <div className="grid gap-4" style={{
          gridTemplateColumns: `repeat(${Math.min(topKPIs.length, 5)}, minmax(0, 1fr))`
        }}>
          {topKPIs.map((key, i) => {
            const def = METRIC_DEFINITIONS.find((m) => m.key === key)!;
            return <KPICard key={key} metric={metricData[key]} label={def.label} delay={i * 60} metricKey={key} />;
          })}
        </div>
      )}

      {bottomKPIs.length > 0 && (
        <div className="grid gap-4" style={{
          gridTemplateColumns: `repeat(${Math.min(bottomKPIs.length, 5)}, minmax(0, 1fr))`
        }}>
          {bottomKPIs.map((key, i) => {
            const def = METRIC_DEFINITIONS.find((m) => m.key === key)!;
            return <KPICard key={key} metric={metricData[key]} label={def.label} delay={(i + 5) * 60} metricKey={key} />;
          })}
        </div>
      )}

      {(showTrend || showFunnel) && (
        <div className={`grid gap-4 ${showTrend && showFunnel ? "grid-cols-3" : "grid-cols-1"}`}>
          {showTrend && <div className="col-span-2"><TrendChart /></div>}
          {showFunnel && (
            <div className="col-span-1">
              <FunnelChart roasValue={metricData.roas?.value} />
            </div>
          )}
        </div>
      )}

      <div className={`grid gap-4 ${showCampaigns && showAttribution ? "grid-cols-2" : "grid-cols-1"}`}>
        {showCampaigns && <CampaignTable campaigns={campaigns} />}
        {showAttribution && <AttributionChart />}
      </div>
    </div>
  );
}
