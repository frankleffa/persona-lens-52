import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Settings2, Plus, X, GripVertical } from "lucide-react";

interface FunnelStage {
  key: string;
  label: string;
}

const AVAILABLE_METRICS: FunnelStage[] = [
  { key: "impressions", label: "Impressões" },
  { key: "clicks", label: "Cliques" },
  { key: "sessions", label: "Sessões" },
  { key: "leads", label: "Leads" },
  { key: "messages", label: "Mensagens" },
  { key: "conversions", label: "Conversões" },
  { key: "events", label: "Eventos" },
  { key: "revenue", label: "Receita" },
];

interface ConsolidatedData {
  investment?: number;
  revenue?: number;
  leads?: number;
  messages?: number;
  cpa?: number;
  ctr?: number;
  cpc?: number;
  conversion_rate?: number;
  sessions?: number;
  events?: number;
}

interface GoogleAdsData {
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

interface MetaAdsData {
  impressions?: number;
  clicks?: number;
  leads?: number;
  messages?: number;
}

interface GA4Data {
  sessions?: number;
  events?: number;
}

interface JourneyFunnelChartProps {
  consolidated?: ConsolidatedData | null;
  googleAds?: GoogleAdsData | null;
  metaAds?: MetaAdsData | null;
  ga4?: GA4Data | null;
}

const DEFAULT_STAGES: FunnelStage[] = [
  { key: "impressions", label: "Impressões" },
  { key: "clicks", label: "Cliques" },
  { key: "sessions", label: "Sessões" },
  { key: "leads", label: "Leads" },
];

const FUNNEL_COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(199, 89%, 48%)",
  "hsl(165, 60%, 45%)",
  "hsl(142, 71%, 45%)",
  "hsl(38, 92%, 55%)",
  "hsl(25, 95%, 53%)",
  "hsl(270, 60%, 60%)",
  "hsl(340, 65%, 55%)",
];

export default function JourneyFunnelChart({ consolidated, googleAds, metaAds, ga4 }: JourneyFunnelChartProps) {
  const [stages, setStages] = useState<FunnelStage[]>(DEFAULT_STAGES);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  // Load saved config
  useEffect(() => {
    async function loadConfig() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from("funnel_configurations")
        .select("*")
        .eq("manager_id", session.user.id)
        .limit(1)
        .maybeSingle();

      if (data) {
        const parsed = data.stages as unknown as FunnelStage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStages(parsed);
        }
        setConfigId(data.id);
      }
    }
    loadConfig();
  }, []);

  const saveConfig = async (newStages: FunnelStage[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const stagesJson = JSON.parse(JSON.stringify(newStages));
    if (configId) {
      await supabase
        .from("funnel_configurations")
        .update({ stages: stagesJson })
        .eq("id", configId);
    } else {
      const { data } = await supabase
        .from("funnel_configurations")
        .insert([{ manager_id: session.user.id, stages: stagesJson }])
        .select("id")
        .single();
      if (data) setConfigId(data.id);
    }
  };

  const getMetricValue = (key: string): number => {
    // Aggregate from all sources
    switch (key) {
      case "impressions":
        return (googleAds?.impressions || 0) + (metaAds?.impressions || 0);
      case "clicks":
        return (googleAds?.clicks || 0) + (metaAds?.clicks || 0);
      case "sessions":
        return ga4?.sessions || consolidated?.sessions || 0;
      case "leads":
        return consolidated?.leads || metaAds?.leads || 0;
      case "messages":
        return consolidated?.messages || metaAds?.messages || 0;
      case "conversions":
        return googleAds?.conversions || 0;
      case "events":
        return ga4?.events || consolidated?.events || 0;
      case "revenue":
        return consolidated?.revenue || 0;
      default:
        return 0;
    }
  };

  const funnelData = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      value: getMetricValue(stage.key),
    }));
  }, [stages, consolidated, googleAds, metaAds, ga4]);

  const maxValue = Math.max(...funnelData.map((d) => d.value), 1);

  const addStage = (metric: FunnelStage) => {
    const newStages = [...stages, metric];
    setStages(newStages);
    saveConfig(newStages);
  };

  const removeStage = (index: number) => {
    const newStages = stages.filter((_, i) => i !== index);
    setStages(newStages);
    saveConfig(newStages);
  };

  const availableToAdd = AVAILABLE_METRICS.filter(
    (m) => !stages.some((s) => s.key === m.key)
  );

  const formatValue = (value: number): string => {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString("pt-BR");
  };

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between mb-5">
        <p className="kpi-label">Funil da Jornada</p>
        <button
          onClick={() => setIsConfiguring(!isConfiguring)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Configurar etapas"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {isConfiguring && (
        <div className="mb-4 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-muted-foreground">Etapas do funil (arraste para reordenar)</p>
          <div className="space-y-1.5">
            {stages.map((stage, i) => (
              <div
                key={stage.key}
                className="flex items-center gap-2 rounded-md bg-card px-2.5 py-1.5 text-xs"
              >
                <GripVertical className="h-3 w-3 text-muted-foreground/50" />
                <span className="flex-1 text-foreground">{stage.label}</span>
                <button
                  onClick={() => removeStage(i)}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          {availableToAdd.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {availableToAdd.map((m) => (
                <button
                  key={m.key}
                  onClick={() => addStage(m)}
                  className="flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3 w-3" />
                  {m.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {funnelData.map((stage, i) => {
          const widthPercent = maxValue > 0 ? Math.max((stage.value / maxValue) * 100, 8) : 8;
          const conversionRate = i > 0 && funnelData[i - 1].value > 0
            ? ((stage.value / funnelData[i - 1].value) * 100).toFixed(1)
            : null;

          return (
            <div key={stage.key} className="group relative">
              {conversionRate && (
                <div className="mb-0.5 text-right">
                  <span className="text-[10px] text-muted-foreground">
                    {conversionRate}% ↓
                  </span>
                </div>
              )}
              <div className="relative flex items-center">
                <div
                  className="relative flex items-center justify-between rounded-md px-3 py-2.5 transition-all duration-500"
                  style={{
                    width: `${widthPercent}%`,
                    background: `linear-gradient(135deg, ${FUNNEL_COLORS[i % FUNNEL_COLORS.length]}, ${FUNNEL_COLORS[i % FUNNEL_COLORS.length]}cc)`,
                    minWidth: "80px",
                    margin: "0 auto",
                  }}
                >
                  <span className="text-xs font-medium text-white truncate">
                    {stage.label}
                  </span>
                  <span className="ml-2 text-xs font-bold text-white whitespace-nowrap">
                    {formatValue(stage.value)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {funnelData.length > 1 && funnelData[0].value > 0 && funnelData[funnelData.length - 1].value > 0 && (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-md bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground">Taxa total:</span>
          <span className="text-sm font-bold text-primary">
            {((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
