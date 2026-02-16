import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MessageSquare, Save } from "lucide-react";
import type { WhatsAppReportMetrics } from "@/lib/whatsappReportTypes";
import { DEFAULT_WHATSAPP_METRICS } from "@/lib/whatsappReportTypes";

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

export default function WhatsAppReportConfig({ clientId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState<WhatsAppReportMetrics>({ ...DEFAULT_WHATSAPP_METRICS });
  const [includeComparison, setIncludeComparison] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
      </CardContent>
    </Card>
  );
}
