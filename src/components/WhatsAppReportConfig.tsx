import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquare, Save, Eye, Send, CheckCircle2, XCircle } from "lucide-react";
import type { WhatsAppReportMetrics } from "@/lib/whatsappReportTypes";
import { DEFAULT_WHATSAPP_METRICS } from "@/lib/whatsappReportTypes";
import { buildWhatsAppReport } from "@/lib/buildWhatsAppReport";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays } from "date-fns";

interface Props {
  clientId: string;
  reportPeriod?: string;
}

// ─── Mock Data for Preview ───

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

// ─── Format Phone ───

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `+${digits}`;
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`;
  if (digits.length <= 9) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`;
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9, 13)}`;
}

// ─── Render Text ───

function renderWhatsAppText(text: string) {
  return text.split("\n").map((line, i) => {
    let rendered = line.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
    rendered = rendered.replace(/_([^_]+)_/g, "<em>$1</em>");
    return (
      <div
        key={i}
        className={line === "" ? "h-2" : ""}
        dangerouslySetInnerHTML={{ __html: rendered || "&nbsp;" }}
      />
    );
  });
}

// ─── Main Component ───

export default function WhatsAppReportConfig({ clientId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Settings
  const [isActive, setIsActive] = useState(false);
  const [sendTime, setSendTime] = useState("09:00:00");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [metrics, setMetrics] = useState<WhatsAppReportMetrics>(DEFAULT_WHATSAPP_METRICS);
  const [includeComparison, setIncludeComparison] = useState(false);
  const [clientLabel, setClientLabel] = useState("Cliente Exemplo");

  // Execution logs
  const [logs, setLogs] = useState<any[]>([]);

  // Load configuration
  useEffect(() => {
    if (!user || !clientId) return;
    async function load() {
      // Load settings
      const { data } = await supabase
        .from("whatsapp_report_settings" as any)
        .select("*")
        .eq("agency_id", user!.id)
        .eq("client_id", clientId)
        .maybeSingle();

      if (data) {
        const d = data as any;
        setIsActive(d.is_active ?? false);
        if (d.send_time) setSendTime(d.send_time);
        if (d.phone_number) setPhoneNumber(d.phone_number);
        if (d.metrics) setMetrics({ ...DEFAULT_WHATSAPP_METRICS, ...(d.metrics as object) });
        setIncludeComparison(d.include_comparison ?? false);
      }

      // Load client name
      const { data: link } = await supabase
        .from("client_manager_links")
        .select("client_label")
        .eq("client_user_id", clientId)
        .limit(1)
        .maybeSingle();

      if (link?.client_label) setClientLabel(link.client_label);

      // Load execution logs
      const { data: exLogs } = await supabase
        .from("whatsapp_report_executions" as any)
        .select("*")
        .eq("client_id", clientId)
        .order("executed_at", { ascending: false })
        .limit(5);

      if (exLogs) setLogs(exLogs);

      setLoaded(true);
    }
    load();
  }, [user, clientId]);

  // Preview Generation
  const previewText = useMemo(() => {
    const today = new Date();
    const startDate = format(subDays(today, 7), "yyyy-MM-dd");
    const endDate = format(subDays(today, 1), "yyyy-MM-dd");

    return buildWhatsAppReport(
      MOCK_DATA,
      metrics,
      includeComparison,
      includeComparison ? MOCK_PREVIOUS : undefined,
      clientLabel,
      startDate,
      endDate
    );
  }, [metrics, includeComparison, clientLabel]);

  // Actions
  async function handleSave() {
    if (!user) return;
    setSaving(true);

    const payload = {
      agency_id: user.id,
      client_id: clientId,
      is_active: isActive,
      send_time: sendTime,
      phone_number: phoneNumber,
      metrics: metrics as any,
      include_comparison: includeComparison,
    };

    const { error } = await (supabase as any)
      .from("whatsapp_report_settings")
      .upsert(payload, { onConflict: "agency_id,client_id" });

    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configurações salvas com sucesso!" });
    }
  }

  async function handleSendTest() {
    if (!phoneNumber) {
      toast({ title: "Telefone vazio", description: "Preencha o telefone para enviar teste.", variant: "destructive" });
      return;
    }

    setSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke("evolution-whatsapp", {
        body: { client_id: clientId, trigger: "manual_test", phone: phoneNumber.replace(/\D/g, "") },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Teste enviado", description: "Verifique o seu WhatsApp." });
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message, variant: "destructive" });
    } finally {
      setSendingTest(false);
    }
  }

  if (!loaded) return null;

  return (
    <Card className="border-white/5 bg-(--surface) shadow-none">
      <CardHeader className="border-b border-white/5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <MessageSquare className="h-4 w-4 text-(--accent)" />
              Relatório Diário via WhatsApp
            </CardTitle>
            <CardDescription className="mt-1 text-xs text-muted-foreground">
              Configure o envio automático de relatórios para o cliente (D-1).
            </CardDescription>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ─── Left: Config Form ─── */}
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Horário de envio</Label>
                <Select value={sendTime} onValueChange={setSendTime} disabled={!isActive}>
                  <SelectTrigger className="h-9 bg-(--surface2) text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 16 }).map((_, i) => {
                      const h = i + 7;
                      const val = `${h.toString().padStart(2, "0")}:00:00`;
                      return <SelectItem key={val} value={val}>{h}:00</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Telefone (WhatsApp)</Label>
                <Input
                  placeholder="+55 (11) 99999-9999"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(formatPhone(e.target.value))}
                  disabled={!isActive}
                  className="h-9 bg-(--surface2) text-sm font-mono"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground">Conteúdo do Relatório</Label>
              <div className="rounded-md border border-white/5 bg-(--surface2) p-3">
                <p className="text-[11px] text-muted-foreground mb-3">
                  O relatório usa a configuração de métricas salvas na aba "Métricas do Relatório" (painel antigo).
                  (Esta versão puxa as configs ativas atuais de `whatsapp_report_settings`)
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Comparativo Semanal</span>
                  <Switch
                    checked={includeComparison}
                    onCheckedChange={setIncludeComparison}
                    disabled={!isActive}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
              <Label className="text-xs text-muted-foreground block">Últimos envios</Label>
              {logs.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">Nenhum envio registrado recentemente.</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className="flex flex-wrap items-center justify-between px-3 py-2 rounded-md bg-(--surface2) border border-white/5 text-[11px]">
                      <span className="text-muted-foreground">
                        {new Date(log.executed_at).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
                        })}
                      </span>
                      <span className="text-foreground">{log.phone_number || "—"}</span>
                      {log.status === "success" ? (
                        <span className="flex items-center gap-1 text-[#22c55e] font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Enviado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[#ef4444] font-semibold" title={log.error_details}>
                          <XCircle className="h-3 w-3" /> Erro
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={saving} className="flex-1 text-xs">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {saving ? "Salvando..." : "Salvar Configurações"}
              </Button>
              <Button
                variant="secondary"
                onClick={handleSendTest}
                disabled={sendingTest || !phoneNumber}
                className="flex-1 text-xs bg-(--surface2) hover:bg-(--surface2)/80 text-foreground border border-white/5"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {sendingTest ? "Enviando..." : "Enviar Teste"}
              </Button>
            </div>
          </div>

          {/* ─── Right: Preview ─── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-(--accent)" />
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Preview da Mensagem
              </Label>
            </div>

            <div className="rounded-xl bg-[#ece5dd] p-4 relative min-h-[400px] border border-border2">
              {/* WhatsApp chat buble */}
              <div
                className="relative rounded-lg bg-white p-4 shadow-xs w-full font-sans text-sm text-[#111b21] max-w-[90%] wrap-break-word"
              >
                {/* Tail pointing left */}
                <div className="absolute top-0 -left-2 w-3 h-4 bg-white" style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />

                {isActive ? (
                  <div className="leading-relaxed opacity-90">
                    {renderWhatsAppText(previewText)}
                  </div>
                ) : (
                  <div className="py-10 text-center text-muted-foreground/60 italic">
                    Ative o relatório para ver o preview.
                  </div>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Os dados no preview são fictícios. O relatório real puxará os resultados da integração Meta.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
