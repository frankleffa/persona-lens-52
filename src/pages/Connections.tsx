import { useState, useEffect, useCallback } from "react";
import { Plug, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "react-router-dom";

interface AdAccount {
  id: string;
  customer_id?: string;
  ad_account_id?: string;
  account_name: string;
  is_active: boolean;
}

interface GA4Account {
  id: string;
  name: string;
  selected: boolean;
}

interface Connection {
  id: string;
  provider: string;
  connected: boolean;
  account_data: GA4Account[];
  expanded: boolean;
}

const PROVIDERS = [
  { id: "google_ads", label: "Google Ads", icon: "G", colorClass: "bg-chart-blue/15 text-chart-blue" },
  { id: "meta_ads", label: "Meta Ads", icon: "M", colorClass: "bg-chart-purple/15 text-chart-purple" },
  { id: "ga4", label: "Google Analytics 4", icon: "A", colorClass: "bg-chart-amber/15 text-chart-amber" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>(
    PROVIDERS.map((p) => ({ id: "", provider: p.id, connected: false, account_data: [], expanded: false }))
  );
  const [googleAccounts, setGoogleAccounts] = useState<AdAccount[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<AdAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const fetchConnections = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-connections`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({}),
      });
      const result = await res.json();

      setConnections(
        PROVIDERS.map((p) => {
          const dbConn = result.connections?.find((c: { provider: string }) => c.provider === p.id);
          return {
            id: dbConn?.id || "",
            provider: p.id,
            connected: dbConn?.connected || false,
            account_data: (dbConn?.account_data as GA4Account[]) || [],
            expanded: false,
          };
        })
      );

      setGoogleAccounts(
        (result.google_accounts || []).map((a: { customer_id: string; account_name: string; is_active: boolean }) => ({
          id: a.customer_id,
          customer_id: a.customer_id,
          account_name: a.account_name,
          is_active: a.is_active,
        }))
      );

      setMetaAccounts(
        (result.meta_accounts || []).map((a: { ad_account_id: string; account_name: string; is_active: boolean }) => ({
          id: a.ad_account_id,
          ad_account_id: a.ad_account_id,
          account_name: a.account_name,
          is_active: a.is_active,
        }))
      );
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  useEffect(() => {
    const connectedProvider = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connectedProvider) {
      toast.success(`${connectedProvider} conectado com sucesso!`);
      fetchConnections();
    }
    if (error) {
      toast.error(`Erro na conexão: ${decodeURIComponent(error)}`);
    }
  }, [searchParams, fetchConnections]);

  const handleConnect = async (provider: string) => {
    setConnecting(provider);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Faça login primeiro"); return; }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/oauth-init`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erro ao iniciar conexão");
      }
    } catch { toast.error("Erro ao conectar"); } finally { setConnecting(null); }
  };

  const handleDisconnect = async (provider: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("oauth_connections").delete().eq("manager_id", session.user.id).eq("provider", provider);
    if (error) { toast.error("Erro ao desconectar"); } else { toast.success("Desconectado"); fetchConnections(); }
  };

  const toggleExpand = (provider: string) => {
    setConnections((prev) => prev.map((c) => (c.provider === provider ? { ...c, expanded: !c.expanded } : c)));
  };

  const toggleGoogleAccount = (customerId: string) => {
    setGoogleAccounts((prev) => prev.map((a) => a.id === customerId ? { ...a, is_active: !a.is_active } : a));
  };

  const toggleMetaAccount = (adAccountId: string) => {
    setMetaAccounts((prev) => prev.map((a) => a.id === adAccountId ? { ...a, is_active: !a.is_active } : a));
  };

  const toggleGA4Account = (provider: string, accId: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.provider === provider
          ? { ...c, account_data: c.account_data.map((a) => a.id === accId ? { ...a, selected: !a.selected } : a) }
          : c
      )
    );
  };

  const saveGoogleAccounts = async () => {
    setSaving("google_ads");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const activeIds = googleAccounts.filter(a => a.is_active).map(a => a.id);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-connections`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_google_accounts", accounts: activeIds }),
      });
      const data = await res.json();
      if (data.success) toast.success(`${activeIds.length} conta(s) Google Ads ativada(s)`);
      else toast.error("Erro ao salvar");
    } catch { toast.error("Erro ao salvar"); } finally { setSaving(null); }
  };

  const saveMetaAccounts = async () => {
    setSaving("meta_ads");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const activeIds = metaAccounts.filter(a => a.is_active).map(a => a.id);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-connections`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_meta_accounts", accounts: activeIds }),
      });
      const data = await res.json();
      if (data.success) toast.success(`${activeIds.length} conta(s) Meta Ads ativada(s)`);
      else toast.error("Erro ao salvar");
    } catch { toast.error("Erro ao salvar"); } finally { setSaving(null); }
  };

  const saveGA4Accounts = async (provider: string) => {
    const conn = connections.find((c) => c.provider === provider);
    if (!conn) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-connections`, {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ provider, account_data: conn.account_data }),
    });
    const data = await res.json();
    if (data.success) {
      const count = conn.account_data.filter((a) => a.selected).length;
      toast.success(`${count} propriedade(s) salva(s)`);
    } else toast.error("Erro ao salvar");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 lg:pt-8 lg:ml-64 flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
        <div className="mb-6 lg:mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Central de Conexões</h1>
              <p className="text-sm text-muted-foreground">Gerencie suas integrações com plataformas de anúncios e analytics</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {connections.map((conn, i) => {
            const providerInfo = PROVIDERS.find((p) => p.id === conn.provider)!;
            const isGoogle = conn.provider === "google_ads";
            const isMeta = conn.provider === "meta_ads";
            const isGA4 = conn.provider === "ga4";
            const accounts = isGoogle ? googleAccounts : isMeta ? metaAccounts : [];

            return (
              <div key={conn.provider} className="card-executive overflow-hidden animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl text-base sm:text-lg font-bold ${providerInfo.colorClass}`}>
                      {providerInfo.icon}
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-foreground">{providerInfo.label}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        {conn.connected ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-chart-positive" />
                            <span className="text-xs font-medium text-chart-positive">Conectado</span>
                            {(isGoogle || isMeta) && (
                              <span className="text-xs text-muted-foreground ml-2">
                                · {accounts.filter(a => a.is_active).length} ativa(s)
                              </span>
                            )}
                          </>
                        ) : (
                          <><XCircle className="h-3.5 w-3.5 text-muted-foreground" /><span className="text-xs font-medium text-muted-foreground">Não conectado</span></>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {conn.connected && (
                      <Button variant="ghost" size="sm" onClick={() => toggleExpand(conn.provider)}>
                        {conn.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    )}
                    {conn.connected ? (
                      <Button variant="outline" size="sm" onClick={() => handleDisconnect(conn.provider)}>Desconectar</Button>
                    ) : (
                      <Button size="sm" onClick={() => handleConnect(conn.provider)} disabled={connecting === conn.provider}>
                        {connecting === conn.provider && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Conectar
                      </Button>
                    )}
                  </div>
                </div>

                {conn.connected && conn.expanded && isGoogle && googleAccounts.length > 0 && (
                  <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecione as contas ativas</p>
                    <div className="space-y-2">
                      {googleAccounts.map((acc) => (
                        <label key={acc.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
                          <Checkbox checked={acc.is_active} onCheckedChange={() => toggleGoogleAccount(acc.id)} />
                          <div className="min-w-0">
                            <span className="text-sm text-foreground block truncate">{acc.account_name}</span>
                            <span className="text-xs text-muted-foreground">ID: {acc.id}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button size="sm" onClick={saveGoogleAccounts} disabled={saving === "google_ads"}>
                        {saving === "google_ads" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}

                {conn.connected && conn.expanded && isMeta && metaAccounts.length > 0 && (
                  <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecione as contas ativas</p>
                    <div className="space-y-2">
                      {metaAccounts.map((acc) => (
                        <label key={acc.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
                          <Checkbox checked={acc.is_active} onCheckedChange={() => toggleMetaAccount(acc.id)} />
                          <div className="min-w-0">
                            <span className="text-sm text-foreground block truncate">{acc.account_name}</span>
                            <span className="text-xs text-muted-foreground">{acc.id}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button size="sm" onClick={saveMetaAccounts} disabled={saving === "meta_ads"}>
                        {saving === "meta_ads" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Salvar
                      </Button>
                    </div>
                  </div>
                )}

                {conn.connected && conn.expanded && isGA4 && conn.account_data.length > 0 && (
                  <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Selecione a propriedade</p>
                    <div className="space-y-2">
                      {conn.account_data.map((acc) => (
                        <label key={acc.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
                          <Checkbox checked={acc.selected} onCheckedChange={() => toggleGA4Account(conn.provider, acc.id)} />
                          <span className="text-sm text-foreground">{acc.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button size="sm" onClick={() => saveGA4Accounts(conn.provider)}>Salvar</Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
