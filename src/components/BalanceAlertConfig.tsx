import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Bell } from "lucide-react";

interface AlertConfig {
  ad_account_id: string;
  threshold_value: number;
  is_active: boolean;
}

interface Props {
  clientId: string;
}

export default function BalanceAlertConfig({ clientId }: Props) {
  const [metaAccounts, setMetaAccounts] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<Record<string, AlertConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [clientId]);

  async function loadData() {
    setLoading(true);
    try {
      const [accountsRes, alertsRes] = await Promise.all([
        supabase
          .from("client_meta_ad_accounts")
          .select("ad_account_id")
          .eq("client_user_id", clientId),
        supabase
          .from("account_balance_alerts")
          .select("*")
          .eq("client_id", clientId),
      ]);

      const accounts = (accountsRes.data || []).map((a) => a.ad_account_id);
      setMetaAccounts(accounts);

      const alertMap: Record<string, AlertConfig> = {};
      accounts.forEach((id) => {
        alertMap[id] = { ad_account_id: id, threshold_value: 0, is_active: false };
      });
      (alertsRes.data || []).forEach((a: any) => {
        if (alertMap[a.ad_account_id]) {
          alertMap[a.ad_account_id] = {
            ad_account_id: a.ad_account_id,
            threshold_value: Number(a.threshold_value),
            is_active: a.is_active,
          };
        }
      });
      setAlerts(alertMap);
    } catch (err) {
      console.error("Error loading balance alert data:", err);
    } finally {
      setLoading(false);
    }
  }

  function updateAlert(accountId: string, field: keyof AlertConfig, value: any) {
    setAlerts((prev) => ({
      ...prev,
      [accountId]: { ...prev[accountId], [field]: value },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const upserts = Object.values(alerts).map((alert) => ({
        agency_id: session.user.id,
        client_id: clientId,
        ad_account_id: alert.ad_account_id,
        threshold_value: alert.threshold_value,
        is_active: alert.is_active,
      }));

      const { error } = await supabase
        .from("account_balance_alerts")
        .upsert(upserts, { onConflict: "agency_id,ad_account_id" });

      if (error) throw error;
      toast.success("Alerta de saldo configurado.");
    } catch (err: any) {
      console.error("Error saving balance alerts:", err);
      toast.error("Erro ao salvar alerta de saldo.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (metaAccounts.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Bell className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Alerta de saldo mínimo</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Receba aviso quando o saldo da conta estiver abaixo do limite definido.
      </p>

      <div className="space-y-3">
        {metaAccounts.map((accountId) => {
          const alert = alerts[accountId];
          if (!alert) return null;

          return (
            <div
              key={accountId}
              className="flex items-center gap-3 rounded-md border border-border bg-background p-3"
            >
              <div className="flex-1 min-w-0">
                <Label className="text-xs font-medium text-foreground truncate block">
                  {accountId}
                </Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={alert.threshold_value || ""}
                    onChange={(e) =>
                      updateAlert(accountId, "threshold_value", parseFloat(e.target.value) || 0)
                    }
                    placeholder="0,00"
                    className="h-8 w-28 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] text-muted-foreground">Ativo</span>
                <Switch
                  checked={alert.is_active}
                  onCheckedChange={(v) => updateAlert(accountId, "is_active", v)}
                />
              </div>
            </div>
          );
        })}
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm" className="mt-4 gap-1.5">
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Salvar alerta
      </Button>
    </div>
  );
}
