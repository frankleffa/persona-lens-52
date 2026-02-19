import { useCallback, useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Settings2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConsolidatedData {
  investment?: number;
  revenue?: number;
  leads?: number;
  messages?: number;
  purchases?: number;
  registrations?: number;
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
  purchases?: number;
  registrations?: number;
}

interface GA4Data {
  sessions?: number;
  events?: number;
}

interface StageConfig {
  key: string;
  label: string;
}

interface JourneyFunnelChartProps {
  consolidated?: ConsolidatedData | null;
  googleAds?: GoogleAdsData | null;
  metaAds?: MetaAdsData | null;
  ga4?: GA4Data | null;
  isManager?: boolean;
  clientId?: string;
}

const AVAILABLE_METRICS: StageConfig[] = [
  { key: "impressions", label: "Impressões" },
  { key: "clicks", label: "Cliques" },
  { key: "sessions", label: "Sessões" },
  { key: "events", label: "Eventos" },
  { key: "leads", label: "Leads" },
  { key: "messages", label: "Mensagens" },
  { key: "registrations", label: "Cadastros" },
  { key: "purchases", label: "Compras" },
];

const DEFAULT_STAGES: StageConfig[] = [
  { key: "impressions", label: "Impressões" },
  { key: "clicks", label: "Cliques" },
  { key: "events", label: "Eventos" },
];

const STAGE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function JourneyFunnelChart({ consolidated, googleAds, metaAds, ga4, isManager, clientId }: JourneyFunnelChartProps) {
  const [showConfig, setShowConfig] = useState(false);
  const [savedStages, setSavedStages] = useState<StageConfig[] | null>(null);
  const [editStages, setEditStages] = useState<StageConfig[]>([]);
  const [configId, setConfigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Metric value map
  const metricValues: Record<string, number> = useMemo(() => ({
    impressions: (googleAds?.impressions || 0) + (metaAds?.impressions || 0),
    clicks: (googleAds?.clicks || 0) + (metaAds?.clicks || 0),
    sessions: ga4?.sessions || 0,
    events: ga4?.events || consolidated?.events || 0,
    leads: consolidated?.leads || metaAds?.leads || 0,
    messages: consolidated?.messages || metaAds?.messages || 0,
    registrations: consolidated?.registrations || metaAds?.registrations || 0,
    purchases: consolidated?.purchases || metaAds?.purchases || 0,
  }), [consolidated, googleAds, metaAds, ga4]);

  // Load saved config
  useEffect(() => {
    if (!clientId) return;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("funnel_configurations")
        .select("*")
        .eq("client_user_id", clientId)
        .eq("manager_id", user.id)
        .maybeSingle();
      if (data) {
        const stages = data.stages as unknown as StageConfig[];
        if (Array.isArray(stages) && stages.length > 0) {
          setSavedStages(stages);
          setConfigId(data.id);
        }
      }
    };
    load();
  }, [clientId]);

  // Determine which stages to use for display
  const configuredStages = useMemo(() => {
    if (savedStages && savedStages.length > 0) return savedStages;

    // Default: auto-detect best conversion
    const messages = metricValues.messages;
    const purchases = metricValues.purchases;
    const registrations = metricValues.registrations;
    const conversions = Math.max(messages, purchases, registrations);
    const convLabel = purchases > 0 && purchases >= Math.max(messages, registrations)
      ? "Compras"
      : registrations > 0 && registrations >= Math.max(messages, purchases)
      ? "Cadastros"
      : "Mensagens";
    const convKey = purchases > 0 && purchases >= Math.max(messages, registrations)
      ? "purchases"
      : registrations > 0 && registrations >= Math.max(messages, purchases)
      ? "registrations"
      : "messages";

    return [
      ...DEFAULT_STAGES,
      { key: convKey, label: convLabel },
    ];
  }, [savedStages, metricValues]);

  // Build display stages (filter out zero values)
  const rawStages = useMemo(() => {
    return configuredStages
      .map((s) => ({ name: s.label, value: metricValues[s.key] || 0 }))
      .filter((s) => s.value > 0);
  }, [configuredStages, metricValues]);

  const hasData = rawStages.length > 0;
  const maxValue = rawStages[0]?.value || 1;

  const firstVal = rawStages[0]?.value || 0;
  const lastVal = rawStages[rawStages.length - 1]?.value || 0;
  const isOnlyCTR = rawStages.length === 2 && rawStages[1]?.name === "Cliques";
  const totalRateLabel = isOnlyCTR ? "CTR" : "Conv. Total";
  const totalRate = firstVal > 0 && lastVal > 0 ? ((lastVal / firstVal) * 100).toFixed(2) : "0.00";

  // Config panel handlers
  const openConfig = useCallback(() => {
    setEditStages(savedStages && savedStages.length > 0 ? [...savedStages] : [...configuredStages]);
    setShowConfig(true);
  }, [savedStages, configuredStages]);

  const isStageActive = (key: string) => editStages.some((s) => s.key === key);

  const toggleStage = (metric: StageConfig) => {
    if (isStageActive(metric.key)) {
      setEditStages((prev) => prev.filter((s) => s.key !== metric.key));
    } else {
      setEditStages((prev) => [...prev, metric]);
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = [...editStages];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setEditStages(items);
  };

  const handleSave = async () => {
    if (!clientId || editStages.length === 0) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      if (configId) {
        await supabase
          .from("funnel_configurations")
          .update({ stages: editStages as any, updated_at: new Date().toISOString() })
          .eq("id", configId);
      } else {
        const { data } = await supabase
          .from("funnel_configurations")
          .insert({
            manager_id: user.id,
            client_user_id: clientId,
            stages: editStages as any,
            name: "Funil Principal",
          })
          .select("id")
          .single();
        if (data) setConfigId(data.id);
      }

      setSavedStages([...editStages]);
      setShowConfig(false);
      toast.success("Funil salvo com sucesso");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between mb-5">
        <p className="kpi-label">Funil da Jornada</p>
        <div className="flex items-center gap-3">
          {hasData && (
            <div className="text-right">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{totalRateLabel}</p>
              <p className="text-lg font-bold text-foreground">{totalRate}%</p>
            </div>
          )}
          {isManager && (
            <button
              onClick={() => showConfig ? setShowConfig(false) : openConfig()}
              className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {showConfig ? "Fechar" : "Configurar"}
            </button>
          )}
        </div>
      </div>

      {/* Config panel */}
      {showConfig && isManager && (
        <div className="animate-fade-in rounded-lg border border-border bg-card p-4 mb-5 space-y-4">
          <p className="text-xs font-medium text-muted-foreground">Selecione e ordene as etapas do funil:</p>

          {/* Checkboxes for available metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {AVAILABLE_METRICS.map((metric) => (
              <label
                key={metric.key}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors text-sm"
              >
                <Checkbox
                  checked={isStageActive(metric.key)}
                  onCheckedChange={() => toggleStage(metric)}
                />
                <span className="text-foreground">{metric.label}</span>
              </label>
            ))}
          </div>

          {/* Drag-and-drop reorder of active stages */}
          {editStages.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Arraste para reordenar:</p>
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="funnel-stages">
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                      {editStages.map((stage, index) => (
                        <Draggable key={stage.key} draggableId={stage.key} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                                snapshot.isDragging
                                  ? "border-primary bg-primary/10 shadow-md"
                                  : "border-border bg-background hover:bg-muted/50"
                              }`}
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-foreground">{stage.label}</span>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || editStages.length === 0}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {!hasData ? (
        <div className="flex h-[220px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Sem dados de funil no período selecionado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rawStages.map((stage, index) => {
            const widthPct = (stage.value / maxValue) * 100;
            const prevVal = index > 0 ? rawStages[index - 1].value : null;
            const stageRate =
              prevVal && prevVal > 0
                ? ((stage.value / prevVal) * 100).toFixed(1)
                : null;

            return (
              <div key={stage.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length] }}
                    />
                    <span className="font-medium text-foreground">{stage.name}</span>
                    {stageRate && (
                      <span className="text-muted-foreground">← {stageRate}%</span>
                    )}
                  </div>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {stage.value.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="h-6 w-full rounded bg-muted overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length],
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
