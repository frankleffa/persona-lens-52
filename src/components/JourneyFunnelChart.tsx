import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Settings2, Plus, X, GripVertical, ChevronDown } from "lucide-react";

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

// Dark luxe palette — deep jewel tones
const FUNNEL_COLORS = [
  { fill: "hsl(220, 70%, 35%)", glow: "hsl(220, 80%, 50%)" },
  { fill: "hsl(200, 65%, 30%)", glow: "hsl(200, 75%, 45%)" },
  { fill: "hsl(175, 55%, 28%)", glow: "hsl(175, 65%, 42%)" },
  { fill: "hsl(150, 50%, 26%)", glow: "hsl(150, 60%, 40%)" },
  { fill: "hsl(35, 55%, 30%)",  glow: "hsl(35, 70%, 45%)" },
  { fill: "hsl(15, 60%, 30%)",  glow: "hsl(15, 70%, 45%)" },
  { fill: "hsl(265, 45%, 32%)", glow: "hsl(265, 55%, 48%)" },
  { fill: "hsl(335, 50%, 30%)", glow: "hsl(335, 60%, 45%)" },
];

export default function JourneyFunnelChart({ consolidated, googleAds, metaAds, ga4 }: JourneyFunnelChartProps) {
  const [stages, setStages] = useState<FunnelStage[]>(DEFAULT_STAGES);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [visibleStages, setVisibleStages] = useState<Set<number>>(new Set());
  const animatedRef = useRef(false);

  // Staggered reveal animation
  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    stages.forEach((_, i) => {
      setTimeout(() => {
        setVisibleStages((prev) => new Set(prev).add(i));
      }, 200 + i * 150);
    });
  }, [stages.length]);

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

      <div className="relative flex flex-col items-center">
        <svg
          viewBox="0 0 400 340"
          className="w-full"
          style={{ maxHeight: "340px" }}
        >
          <defs>
            {funnelData.map((_, i) => {
              const c = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
              return (
                <linearGradient key={`grad-${i}`} id={`funnel-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={c.glow} stopOpacity="0.85" />
                  <stop offset="100%" stopColor={c.fill} stopOpacity="0.95" />
                </linearGradient>
              );
            })}
            {funnelData.map((_, i) => {
              const c = FUNNEL_COLORS[i % FUNNEL_COLORS.length];
              return (
                <filter key={`glow-${i}`} id={`funnel-glow-${i}`}>
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feFlood floodColor={c.glow} floodOpacity="0.3" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              );
            })}
          </defs>

          {funnelData.map((stage, i) => {
            const total = funnelData.length;
            const stageHeight = 300 / total;
            const gap = 3;
            const y = 20 + i * stageHeight;
            const segH = stageHeight - gap;
            const isVisible = visibleStages.has(i);

            // Funnel shape
            const minWidth = 50;
            const maxWidth = 360;
            const topWidthPercent = maxValue > 0 ? Math.max(stage.value / maxValue, 0.18) : 0.18;
            const nextValue = i < total - 1 ? funnelData[i + 1].value : stage.value * 0.4;
            const bottomWidthPercent = maxValue > 0 ? Math.max(nextValue / maxValue, 0.12) : 0.12;

            const topW = minWidth + (maxWidth - minWidth) * topWidthPercent;
            const botW = minWidth + (maxWidth - minWidth) * bottomWidthPercent;

            const cx = 200;
            const topLeft = cx - topW / 2;
            const topRight = cx + topW / 2;
            const botLeft = cx - botW / 2;
            const botRight = cx + botW / 2;

            // Rounded trapezoid via quadratic curves
            const r = 4;
            const path = `
              M ${topLeft + r} ${y}
              L ${topRight - r} ${y}
              Q ${topRight} ${y} ${topRight} ${y + r}
              L ${botRight} ${y + segH - r}
              Q ${botRight} ${y + segH} ${botRight - r} ${y + segH}
              L ${botLeft + r} ${y + segH}
              Q ${botLeft} ${y + segH} ${botLeft} ${y + segH - r}
              L ${topLeft} ${y + r}
              Q ${topLeft} ${y} ${topLeft + r} ${y}
              Z
            `;

            const conversionRate = i > 0 && funnelData[i - 1].value > 0
              ? ((stage.value / funnelData[i - 1].value) * 100).toFixed(1)
              : null;

            const textY = y + segH / 2;
            const c = FUNNEL_COLORS[i % FUNNEL_COLORS.length];

            return (
              <g
                key={stage.key}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? "translateY(0)" : "translateY(12px)",
                  transition: `opacity 0.5s ease-out, transform 0.5s ease-out`,
                }}
              >
                <path
                  d={path}
                  fill={`url(#funnel-grad-${i})`}
                  stroke={c.glow}
                  strokeWidth="0.5"
                  strokeOpacity="0.4"
                  filter={`url(#funnel-glow-${i})`}
                />
                {/* Stage label */}
                <text
                  x={cx}
                  y={textY - 3}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="hsl(210, 20%, 85%)"
                  fontSize="10"
                  fontWeight="500"
                  letterSpacing="0.5"
                  style={{ textShadow: "0 1px 4px rgba(0,0,0,0.6)" }}
                >
                  {stage.label.toUpperCase()}
                </text>
                {/* Value */}
                <text
                  x={cx}
                  y={textY + 12}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="800"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
                >
                  {formatValue(stage.value)}
                </text>
                {/* Conversion rate connector */}
                {conversionRate && (
                  <>
                    <line
                      x1={topRight + 4}
                      y1={y - gap / 2}
                      x2={topRight + 16}
                      y2={y - gap / 2}
                      stroke="hsl(215, 15%, 35%)"
                      strokeWidth="0.5"
                      strokeDasharray="2 2"
                    />
                    <text
                      x={topRight + 20}
                      y={y - gap / 2}
                      textAnchor="start"
                      dominantBaseline="middle"
                      fill="hsl(215, 15%, 45%)"
                      fontSize="9"
                      fontWeight="500"
                    >
                      {conversionRate}%
                    </text>
                    <ChevronDown
                      x={topRight + 20 + conversionRate.length * 5 + 8}
                      y={y - gap / 2 - 4}
                      width={8}
                      height={8}
                      color="hsl(215, 15%, 40%)"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {funnelData.length > 1 && funnelData[0].value > 0 && funnelData[funnelData.length - 1].value > 0 && (
        <div className="mt-2 flex items-center justify-center gap-2 rounded-lg border border-border/30 bg-muted/20 px-4 py-2.5 backdrop-blur-sm">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Conversão total</span>
          <span className="text-sm font-bold text-primary">
            {((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}
