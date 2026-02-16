import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Save, Eye } from "lucide-react";
import type { WhatsAppReportMetrics } from "@/lib/whatsappReportTypes";
import { DEFAULT_WHATSAPP_METRICS } from "@/lib/whatsappReportTypes";
import { buildWhatsAppReport } from "@/lib/buildWhatsAppReport";
import { format, subDays } from "date-fns";

interface Props {
  clientId: string;
}

interface MetricOption {
  key: keyof WhatsAppReportMetrics;
  label: string;
}

const PERFORMANCE_METRICS: MetricOption[] = [
  { key: "investment", label: "Investimento" },
  { key: "revenue", label: "Receita" },
  { key: "roas", label: "ROAS" },
  { key: "cpa", label: "CPA" },
  { key: "cpc", label: "CPC" },
  { key: "cpm", label: "CPM" },
];

const ENGAGEMENT_METRICS: MetricOption[] = [
  { key: "clicks", label: "Cliques" },
  { key: "impressions", label: "Impressões" },
  { key: "ctr", label: "CTR" },
];

const RESULT_METRICS: MetricOption[] = [
  { key: "conversions", label: "Conversões" },
  { key: "leads", label: "Leads" },
  { key: "messages", label: "Mensagens" },
];

const MOCK_DATA = {
  spend: 1000,
  revenue: 3200,
  roas: 3.2,
  conversions: 45,
  clicks: 800,
  impressions: 15000,
  ctr: 5.33,
  cpa: 22.22,
  cpc: 1.25,
  cpm: 66.67,
  leads: 18,
  messages: 32,
};

const MOCK_PREVIOUS = {
  spend: 890,
  revenue: 2700,
  roas: 3.03,
  conversions: 38,
  clicks: 720,
  impressions: 13500,
  ctr: 5.33,
  cpa: 23.42,
  cpc: 1.24,
  cpm: 65.93,
  leads: 15,
  messages: 28,
};

function renderWhatsAppText(text: string) {
  return text.split("\n").map((line, i) => {
    // Bold: *text*
    let rendered = line.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
    // Italic: _text_
    rendered = rendered.replace(/_([^_]+)_/g, '<em>$1</em>');
    return (
      <div
        key={i}
        className={line === "" ? "h-2" : ""}
        dangerouslySetInnerHTML={{ __html: rendered || "&nbsp;" }}
      />
    );
  });
}

export default function WhatsAppReportConfig({ clientId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<WhatsAppReportMetrics>({ ...DEFAULT_WHATSAPP_METRICS });
  const [includeComparison, setIncludeComparison] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [clientLabel, setClientLabel] = useState("Cliente Exemplo");
  const [realData, setRealData] = useState<typeof MOCK_DATA | null>(null);

  useEffect(() => {
    if (!user || !clientId) return;
    async function load() {
      const { data } = await supabase
        .from("whatsapp_report_settings" as any)
        .select("metrics, include_comparison")
        .eq("agency_id", user!.id)
        .eq("client_id", clientId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        setMetrics({ ...DEFAULT_WHATSAPP_METRICS, ...(d.metrics as WhatsAppReportMetrics) });
        setIncludeComparison(d.include_comparison ?? false);
      }
      setLoaded(true);
    }
    load();
  }, [user, clientId]);

  // Load client label
  useEffect(() => {
    if (!clientId) return;
    async function loadLabel() {
      const { data } = await supabase
        .from("client_manager_links")
        .select("client_label")
        .eq("client_user_id", clientId)
        .limit(1)
        .maybeSingle();
      if (data?.client_label) setClientLabel(data.client_label);
    }
    loadLabel();
  }, [clientId]);

  // Load real recent metrics for preview
  useEffect(() => {
    if (!clientId) return;
    async function loadRecentMetrics() {
      const { data } = await supabase
        .from("daily_metrics")
        .select("spend, revenue, roas, cpa, cpc, cpm, clicks, impressions, ctr, conversions")
        .eq("client_id", clientId)
        .order("date", { ascending: false })
        .limit(7);

      if (data && data.length > 0) {
        const agg = {
          spend: 0, revenue: 0, roas: 0, cpa: 0, cpc: 0, cpm: 0,
          clicks: 0, impressions: 0, ctr: 0, conversions: 0, leads: 0, messages: 0,
        };
        for (const row of data) {
          agg.spend += Number(row.spend) || 0;
          agg.revenue += Number(row.revenue) || 0;
          agg.clicks += Number(row.clicks) || 0;
          agg.impressions += Number(row.impressions) || 0;
          agg.conversions += Number(row.conversions) || 0;
        }
        if (agg.spend > 0 && agg.conversions > 0) agg.cpa = agg.spend / agg.conversions;
        if (agg.spend > 0 && agg.revenue > 0) agg.roas = agg.revenue / agg.spend;
        if (agg.impressions > 0) agg.ctr = (agg.clicks / agg.impressions) * 100;
        if (agg.clicks > 0) agg.cpc = agg.spend / agg.clicks;
        if (agg.impressions > 0) agg.cpm = (agg.spend / agg.impressions) * 1000;
        setRealData(agg);
      }
    }
    loadRecentMetrics();
  }, [clientId]);

  const previewData = realData || MOCK_DATA;
  const today = new Date();
  const previewStartDate = format(subDays(today, 7), "yyyy-MM-dd");
  const previewEndDate = format(subDays(today, 1), "yyyy-MM-dd");

  const hasAnyMetric = useMemo(() => {
    return Object.values(metrics).some(Boolean);
  }, [metrics]);

  const previewText = useMemo(() => {
    if (!hasAnyMetric) return "";
    return buildWhatsAppReport(
      previewData,
      metrics,
      includeComparison,
      includeComparison ? MOCK_PREVIOUS : undefined,
      clientLabel,
      previewStartDate,
      previewEndDate,
    );
  }, [metrics, includeComparison, previewData, clientLabel, previewStartDate, previewEndDate, hasAnyMetric]);

  function toggleMetric(key: keyof WhatsAppReportMetrics) {
    setMetrics((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const payload = {
      agency_id: user.id,
      client_id: clientId,
      metrics: metrics as any,
      include_comparison: includeComparison,
    };

    const { error } = await (supabase as any)
      .from("whatsapp_report_settings")
      .upsert(payload, { onConflict: "agency_id,client_id" });

    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração de relatório atualizada." });
    }
  }

  if (!loaded) return null;

  function renderGroup(title: string, options: MetricOption[]) {
    return (
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
        <div className="space-y-2">
          {options.map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={metrics[opt.key]}
                onCheckedChange={() => toggleMetric(opt.key)}
              />
              <Label className="cursor-pointer font-normal text-sm">{opt.label}</Label>
            </label>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <MessageSquare className="h-4 w-4 text-primary" />
          Métricas do relatório WhatsApp
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Selecione quais indicadores serão enviados ao cliente.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Metric selection */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {renderGroup("Performance", PERFORMANCE_METRICS)}
              {renderGroup("Engajamento", ENGAGEMENT_METRICS)}
              {renderGroup("Resultado", RESULT_METRICS)}
            </div>

            <div className="border-t pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={includeComparison}
                  onCheckedChange={() => setIncludeComparison(!includeComparison)}
                />
                <Label className="cursor-pointer font-normal text-sm">
                  Incluir comparativo com período anterior
                </Label>
              </label>
            </div>

            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {saving ? "Salvando..." : "Salvar configuração"}
              </Button>
            </div>
          </div>

          {/* Right: Live preview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">Preview do relatório</p>
            </div>
            <div className="rounded-xl bg-[hsl(var(--muted))] p-3">
              <div
                className="rounded-lg bg-background p-4 shadow-sm max-h-[420px] overflow-y-auto"
                style={{ fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif" }}
              >
                {hasAnyMetric ? (
                  <div className="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words">
                    {renderWhatsAppText(previewText)}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Selecione ao menos uma métrica para visualizar o relatório.
                  </p>
                )}
              </div>
              {realData && (
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Dados reais dos últimos 7 dias
                </p>
              )}
              {!realData && (
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Dados de exemplo (sem dados reais disponíveis)
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
