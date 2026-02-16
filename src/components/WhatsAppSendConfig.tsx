import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Save, Phone } from "lucide-react";

interface Props {
  clientId: string;
}

type Frequency = "daily" | "weekly" | "manual";

const WEEKDAY_OPTIONS = [
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export default function WhatsAppSendConfig({ clientId }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("manual");
  const [weekday, setWeekday] = useState<number | null>(null);
  const [sendTime, setSendTime] = useState("09:00");
  // isActive is now derived from frequency: manual = inactive, others = active
  const isActive = frequency !== "manual";
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user || !clientId) return;
    async function load() {
      const { data } = await (supabase as any)
        .from("whatsapp_report_settings")
        .select("phone_number, frequency, weekday, send_time, is_active")
        .eq("agency_id", user!.id)
        .eq("client_id", clientId)
        .maybeSingle();

      if (data) {
        setPhoneNumber(data.phone_number || "");
        setFrequency((data.frequency as Frequency) || "manual");
        setWeekday(data.weekday ?? null);
        setSendTime(data.send_time || "09:00");
        // isActive is derived from frequency, so no need to set it separately
        // but we ensure frequency is correctly loaded
        setFrequency((data.frequency as Frequency) || "manual");
      }
      setLoaded(true);
    }
    load();
  }, [user, clientId]);

  const isMandatoryFieldMissing = isActive && !phoneNumber.trim();
  const canSave = !isMandatoryFieldMissing;

  async function handleSave() {
    if (!user) return;
    if (!canSave) {
      toast({ title: "Erro", description: "Informe o número de destino para ativar o envio automático.", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload: Record<string, any> = {
      agency_id: user.id,
      client_id: clientId,
      phone_number: phoneNumber.trim() || null,
      frequency,
      weekday: frequency === "weekly" ? weekday : null,
      send_time: frequency !== "manual" ? sendTime : null,
      is_active: isActive,
    };

    const { error } = await (supabase as any)
      .from("whatsapp_report_settings")
      .upsert(payload, { onConflict: "agency_id,client_id" });

    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração de envio salva." });
    }
  }

  if (!loaded) return null;

  async function handleSendNow() {
    toast({ 
      title: "Envio manual", 
      description: "Funcionalidade de envio instantâneo será implementada em breve." 
    });
  }

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Send className="h-4 w-4 text-primary" />
            Envio automático
          </CardTitle>
          {isActive ? (
            <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-600 text-xs">
              Automação ativa
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Envio manual
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Defina quando e para quem o relatório será enviado automaticamente.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Frequency */}
        <div className="space-y-1.5">
          <Label className="text-sm">Frequência</Label>
          <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Weekday (only for weekly) */}
        {frequency === "weekly" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Dia da semana</Label>
            <Select
              value={weekday != null ? String(weekday) : ""}
              onValueChange={(v) => setWeekday(Number(v))}
            >
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Selecione o dia" />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAY_OPTIONS.map((d) => (
                  <SelectItem key={d.value} value={String(d.value)}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Send time (not for manual) */}
        {frequency !== "manual" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Horário</Label>
            <Input
              type="time"
              value={sendTime}
              onChange={(e) => setSendTime(e.target.value)}
              className="max-w-[140px]"
            />
          </div>
        )}

        {/* Phone number */}
        <div className="space-y-1.5">
          <Label className="text-sm">
            Número de destino {isActive && <span className="text-destructive">*</span>}
          </Label>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="5511999999999"
              className="max-w-xs"
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Telefone com código do país (ex: 5511999999999)
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between border-t pt-4">
          <div>
            {!isActive && (
              <Button variant="outline" size="sm" onClick={handleSendNow}>
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Enviar agora
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={saving || !canSave}>
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Salvando..." : "Salvar configuração"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
