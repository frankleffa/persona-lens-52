import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Save, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface AvailableAccounts {
  google: Array<{ customer_id: string; account_name: string }>;
  meta: Array<{ ad_account_id: string; account_name: string }>;
  ga4: Array<{ property_id: string; name: string }>;
}

interface ClientAccountConfigProps {
  clientUserId: string;
  clientLabel: string;
  assignedGoogle: string[];
  assignedMeta: string[];
  assignedGA4: string[];
  available: AvailableAccounts;
  onSaved: () => void;
}

async function saveClientAccounts(body: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-clients`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  return res.json();
}

export default function ClientAccountConfig({
  clientUserId,
  clientLabel,
  assignedGoogle,
  assignedMeta,
  assignedGA4,
  available,
  onSaved,
}: ClientAccountConfigProps) {
  const [expanded, setExpanded] = useState(false);
  const [google, setGoogle] = useState<string[]>(assignedGoogle);
  const [meta, setMeta] = useState<string[]>(assignedMeta);
  const [ga4, setGA4] = useState<string[]>(assignedGA4);
  const [saving, setSaving] = useState(false);

  const toggleGoogle = (id: string) =>
    setGoogle((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleMeta = (id: string) =>
    setMeta((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleGA4 = (id: string) =>
    setGA4((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveClientAccounts({
        action: "save_accounts",
        client_user_id: clientUserId,
        google_accounts: google,
        meta_accounts: meta,
        ga4_properties: ga4,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Contas de ${clientLabel} salvas!`);
        onSaved();
      }
    } catch {
      toast.error("Erro ao salvar contas");
    } finally {
      setSaving(false);
    }
  };

  const hasAccounts = available.google.length > 0 || available.meta.length > 0 || available.ga4.length > 0;

  if (!hasAccounts) return null;

  const totalAssigned = google.length + meta.length + ga4.length;

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>
          {totalAssigned} conta{totalAssigned !== 1 ? "s" : ""} vinculada{totalAssigned !== 1 ? "s" : ""}
        </span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="px-6 pb-4 space-y-4">
          {/* Google Ads */}
          {available.google.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-chart-blue mb-2">
                Google Ads
              </p>
              <div className="space-y-1.5">
                {available.google.map((acc) => (
                  <label
                    key={acc.customer_id}
                    className="flex items-center gap-2.5 rounded-lg border border-border/50 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={google.includes(acc.customer_id)}
                      onCheckedChange={() => toggleGoogle(acc.customer_id)}
                    />
                    <span className="text-sm text-foreground">{acc.account_name || acc.customer_id}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{acc.customer_id}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Meta Ads */}
          {available.meta.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-chart-purple mb-2">
                Meta Ads
              </p>
              <div className="space-y-1.5">
                {available.meta.map((acc) => (
                  <label
                    key={acc.ad_account_id}
                    className="flex items-center gap-2.5 rounded-lg border border-border/50 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={meta.includes(acc.ad_account_id)}
                      onCheckedChange={() => toggleMeta(acc.ad_account_id)}
                    />
                    <span className="text-sm text-foreground">{acc.account_name || acc.ad_account_id}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{acc.ad_account_id}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* GA4 */}
          {available.ga4.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-chart-amber mb-2">
                Google Analytics 4
              </p>
              <div className="space-y-1.5">
                {available.ga4.map((prop) => (
                  <label
                    key={prop.property_id}
                    className="flex items-center gap-2.5 rounded-lg border border-border/50 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={ga4.includes(prop.property_id)}
                      onCheckedChange={() => toggleGA4(prop.property_id)}
                    />
                    <span className="text-sm text-foreground">{prop.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{prop.property_id}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar Contas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
