import { useState, useEffect, useCallback, useRef } from "react";
import { Plug, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2, Save, QrCode, RefreshCw, AlertTriangle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useManagerClients } from "@/hooks/useManagerClients";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdAccount {
  id: string;
  customer_id?: string;
  ad_account_id?: string;
  property_id?: string;
  account_name: string;
  is_active: boolean;
  updated_at?: string;
}

interface Connection {
  id: string;
  provider: string;
  connected: boolean;
  expanded: boolean;
  updated_at?: string;
}

interface TokenInfo {
  provider: string;
  token_expires_at: string | null;
}

interface WhatsAppAccount {
  id: string;
  client_id: string | null;
  instance_name: string;
  status: string;
}

interface ConnectionsData {
  connections: Connection[];
  googleAccounts: AdAccount[];
  metaAccounts: AdAccount[];
  ga4Accounts: AdAccount[];
  whatsappAccounts: WhatsAppAccount[];
  tokenInfo: TokenInfo[];
}

const PROVIDERS = [
  { id: "google_ads", label: "Google Ads", icon: "G", colorClass: "bg-chart-blue/15 text-chart-blue" },
  { id: "meta_ads", label: "Meta Ads", icon: "M", colorClass: "bg-chart-purple/15 text-chart-purple" },
  { id: "ga4", label: "Google Analytics 4", icon: "A", colorClass: "bg-chart-amber/15 text-chart-amber" },
  { id: "whatsapp", label: "WhatsApp Business", icon: "W", colorClass: "bg-green-500/15 text-green-500" },
];

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function fetchConnectionsData(): Promise<ConnectionsData> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { connections: PROVIDERS.map((p) => ({ id: "", provider: p.id, connected: false, expanded: false })), googleAccounts: [], metaAccounts: [], ga4Accounts: [], whatsappAccounts: [], tokenInfo: [] };

  const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-connections`, {
    headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    method: "POST",
    body: JSON.stringify({}),
  });
  const result = await res.json();

  const { data: waConns } = await supabase
    .from("whatsapp_connections")
    .select("*")
    .eq("agency_id", session.user.id);

  const whatsappAccounts: WhatsAppAccount[] = (waConns || []).map((conn: any) => ({
    id: conn.id,
    client_id: conn.client_id,
    instance_name: conn.instance_name,
    status: conn.status,
  }));

  const hasConnectedWhatsApp = whatsappAccounts.some(a => a.status === "connected");

  const connections: Connection[] = PROVIDERS.map((p) => {
    if (p.id === "whatsapp") return { id: "", provider: "whatsapp", connected: hasConnectedWhatsApp, expanded: true };
    const dbConn = result.connections?.find((c: { provider: string }) => c.provider === p.id);
    return { id: dbConn?.id || "", provider: p.id, connected: dbConn?.connected || false, expanded: false, updated_at: dbConn?.updated_at };
  });

  const googleAccounts: AdAccount[] = (result.google_accounts || []).map((a: any) => ({
    id: a.customer_id, customer_id: a.customer_id, account_name: a.account_name, is_active: a.is_active, updated_at: a.updated_at,
  }));

  const metaAccounts: AdAccount[] = (result.meta_accounts || []).map((a: any) => ({
    id: a.ad_account_id, ad_account_id: a.ad_account_id, account_name: a.account_name, is_active: a.is_active, updated_at: a.updated_at,
  }));

  const ga4Accounts: AdAccount[] = (result.ga4_properties || []).map((a: any) => ({
    id: a.property_id, property_id: a.property_id, account_name: a.property_name || a.property_id, is_active: a.is_active, updated_at: a.updated_at,
  }));

  return { connections, googleAccounts, metaAccounts, ga4Accounts, whatsappAccounts, tokenInfo: result.token_info || [] };
}

export default function ConnectionsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { clients } = useManagerClients(true);

  const { data: connData, isLoading: loading } = useQuery({
    queryKey: ["connections"],
    queryFn: fetchConnectionsData,
    staleTime: 2 * 60 * 1000,
  });

  const [connections, setConnections] = useState<Connection[]>(
    PROVIDERS.map((p) => ({ id: "", provider: p.id, connected: false, expanded: false }))
  );
  const [googleAccounts, setGoogleAccounts] = useState<AdAccount[]>([]);
  const [metaAccounts, setMetaAccounts] = useState<AdAccount[]>([]);
  const [ga4Accounts, setGa4Accounts] = useState<AdAccount[]>([]);
  const [whatsappAccounts, setWhatsappAccounts] = useState<WhatsAppAccount[]>([]);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [selectedWhatsappClient, setSelectedWhatsappClient] = useState<string | null>(null);
  const [accountSearch, setAccountSearch] = useState<Record<string, string>>({});

  // WhatsApp QR Code modal state
  const [waQrModalOpen, setWaQrModalOpen] = useState(false);
  const [waQrCode, setWaQrCode] = useState<string | null>(null);
  const [waQrLoading, setWaQrLoading] = useState(false);
  const [waPolling, setWaPolling] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (connData) {
      setConnections(connData.connections);
      setGoogleAccounts(connData.googleAccounts);
      setMetaAccounts(connData.metaAccounts);
      setGa4Accounts(connData.ga4Accounts);
      setWhatsappAccounts(connData.whatsappAccounts);
      setTokenInfo(connData.tokenInfo);
    }
  }, [connData]);

  const refetchConnections = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["connections"] });
  }, [queryClient]);

  useEffect(() => {
    const connectedProvider = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connectedProvider) {
      toast.success(`${connectedProvider} conectado com sucesso!`);
      refetchConnections();
    }
    if (error) {
      toast.error(`Erro na conexão: ${decodeURIComponent(error)}`);
    }
  }, [searchParams, refetchConnections]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ── Sync ALL providers ──
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" };
      const callAction = (action: string) =>
        fetch(`${SUPABASE_URL}/functions/v1/manage-connections`, {
          method: "POST", headers,
          body: JSON.stringify({ action }),
        }).then(r => r.json()).catch(() => ({ error: true }));

      const connectedProviders = connections.filter(c => c.connected && c.provider !== "whatsapp").map(c => c.provider);
      
      const results = await Promise.allSettled(
        connectedProviders.map(p => {
          if (p === "meta_ads") return callAction("sync_meta_accounts");
          if (p === "google_ads") return callAction("sync_google_accounts");
          if (p === "ga4") return callAction("sync_ga4_properties");
          return Promise.resolve({ success: true });
        })
      );

      const errors = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && r.value?.error));
      
      refetchConnections();
      if (errors.length > 0) {
        toast.warning(`Sincronização parcial: ${connectedProviders.length - errors.length}/${connectedProviders.length} plataformas atualizadas`);
      } else if (connectedProviders.length === 0) {
        toast.info("Nenhuma plataforma conectada para sincronizar");
      } else {
        toast.success("Todas as contas sincronizadas com sucesso!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao sincronizar: ${message}`);
    } finally {
      setSyncing(false);
    }
  }, [refetchConnections, connections]);

  const startPolling = useCallback((clientId: string | null) => {
    setWaPolling(true);
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`${SUPABASE_URL}/functions/v1/evolution-whatsapp`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "check-status", client_id: clientId }),
        });
        const data = await res.json();

        if (data.connected) {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setWaPolling(false);
          setWaQrModalOpen(false);
          setWaQrCode(null);
          toast.success("WhatsApp conectado com sucesso!");
          refetchConnections();
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 3000);
  }, [refetchConnections]);

  const handleConnectWhatsApp = async (clientId: string | null) => {
    if (!clientId) { toast.error("Selecione um cliente primeiro"); return; }
    setConnecting("whatsapp");
    setWaQrLoading(true);
    setWaQrModalOpen(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Faça login primeiro"); return; }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/evolution-whatsapp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-instance", client_id: clientId }),
      });
      const data = await res.json();

      if (data.already_connected) {
        setWaQrModalOpen(false);
        toast.success("WhatsApp já está conectado!");
        refetchConnections();
        return;
      }

      if (data.qrcode) {
        setWaQrCode(data.qrcode);
        startPolling(clientId);
      } else {
        const qrRes = await fetch(`${SUPABASE_URL}/functions/v1/evolution-whatsapp`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "get-qrcode", client_id: clientId }),
        });
        const qrData = await qrRes.json();
        if (qrData.qrcode) {
          setWaQrCode(qrData.qrcode);
          startPolling(clientId);
        } else {
          toast.error("Não foi possível gerar o QR Code. Tente novamente.");
          setWaQrModalOpen(false);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao conectar WhatsApp: ${message}`);
      setWaQrModalOpen(false);
    } finally {
      setWaQrLoading(false);
      setConnecting(null);
    }
  };

  const handleDisconnectWhatsApp = async (clientId: string | null) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      await fetch(`${SUPABASE_URL}/functions/v1/evolution-whatsapp`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", client_id: clientId }),
      });
    } catch (e) {
      console.error(e);
    }

    toast.success("WhatsApp desconectado");
    refetchConnections();
  };

  const handleConnect = async (provider: string) => {
    if (provider === "whatsapp") return;

    setConnecting(provider);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Faça login primeiro"); return; }

      const res = await fetch(`${SUPABASE_URL}/functions/v1/oauth-init`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erro ao iniciar conexão OAuth");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao conectar ${provider}: ${message}`);
    } finally { setConnecting(null); }
  };

  // ── Disconnect with cleanup ──
  const handleDisconnect = async (provider: string) => {
    if (provider === "whatsapp") return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-connections`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect", provider }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Desconectado com sucesso");
        refetchConnections();
      } else {
        toast.error(data.error || "Erro ao desconectar");
      }
    } catch {
      toast.error("Erro ao desconectar");
    }
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

  const toggleGA4Account = (propId: string) => {
    setGa4Accounts((prev) => prev.map((a) => a.id === propId ? { ...a, is_active: !a.is_active } : a));
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
      else toast.error(data.error || "Erro ao salvar contas Google Ads");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao salvar: ${message}`);
    } finally { setSaving(null); }
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
      else toast.error(data.error || "Erro ao salvar contas Meta Ads");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao salvar: ${message}`);
    } finally { setSaving(null); }
  };

  const saveGA4Accounts = async () => {
    setSaving("ga4");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const activeIds = ga4Accounts.filter(a => a.is_active).map(a => a.id);
      const res = await fetch(`${SUPABASE_URL}/functions/v1/manage-connections`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_ga4_properties", accounts: activeIds }),
      });
      const data = await res.json();
      if (data.success) toast.success(`${activeIds.length} propriedade(s) GA4 ativada(s)`);
      else toast.error(data.error || "Erro ao salvar propriedades GA4");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro ao salvar: ${message}`);
    } finally { setSaving(null); }
  };

  const isTokenExpired = (provider: string): boolean => {
    const info = tokenInfo.find(t => t.provider === provider);
    if (!info?.token_expires_at) return false;
    return new Date(info.token_expires_at).getTime() < Date.now();
  };

  const getLastSyncDate = (accounts: AdAccount[]): string | null => {
    const dates = accounts.map(a => a.updated_at).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    const latest = dates.sort().reverse()[0];
    try {
      return formatDistanceToNow(new Date(latest), { addSuffix: true, locale: ptBR });
    } catch {
      return null;
    }
  };

  const filterAccounts = (accounts: AdAccount[], provider: string) => {
    const search = (accountSearch[provider] || "").toLowerCase();
    if (!search) return accounts;
    return accounts.filter(a => a.account_name.toLowerCase().includes(search) || a.id.toLowerCase().includes(search));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
          <div className="mb-6 lg:mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card-executive p-6">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-9 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const renderAccountList = (accounts: AdAccount[], provider: string, toggleFn: (id: string) => void, saveFn: () => void, savingKey: string, labelPlural: string) => {
    const filtered = filterAccounts(accounts, provider);
    return (
      <div className="border-t border-border bg-muted/30 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Selecione as {labelPlural} ativas
          </p>
          {accounts.length > 5 && (
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="h-8 pl-8 text-xs"
                value={accountSearch[provider] || ""}
                onChange={(e) => setAccountSearch(prev => ({ ...prev, [provider]: e.target.value }))}
              />
            </div>
          )}
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filtered.map((acc) => (
            <label key={acc.id} className="flex cursor-pointer items-center gap-3 rounded-lg bg-background/20 p-3 transition-colors hover:bg-muted/50">
              <Checkbox checked={acc.is_active} onCheckedChange={() => toggleFn(acc.id)} />
              <div className="min-w-0">
                <span className="text-sm text-foreground block truncate">{acc.account_name}</span>
                <span className="text-xs text-muted-foreground">ID: {acc.id}</span>
              </div>
            </label>
          ))}
          {filtered.length === 0 && accounts.length > 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma conta encontrada para "{accountSearch[provider]}"</p>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={saveFn} disabled={saving === savingKey}>
            {saving === savingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
        <div className="mb-6 lg:mb-8 animate-fade-in">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">Central de Conexões</h1>
                <p className="text-sm text-muted-foreground">Gerencie suas integrações com plataformas de anúncios e analytics</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="gap-2 shrink-0"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Sincronizando..." : "Sincronizar Contas"}
            </Button>
          </div>
        </div>

        <div className="space-y-4 lg:space-y-6">
          {connections.map((conn, i) => {
            const providerInfo = PROVIDERS.find((p) => p.id === conn.provider)!;
            const isGoogle = conn.provider === "google_ads";
            const isMeta = conn.provider === "meta_ads";
            const isGA4 = conn.provider === "ga4";
            const accounts = isGoogle ? googleAccounts : isMeta ? metaAccounts : isGA4 ? ga4Accounts : [];

            const isWhatsApp = conn.provider === "whatsapp";

            if (isWhatsApp) {
              return (
                <div key={conn.provider} className="connection-row p-0 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6 border-b border-border/20">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="connection-avatar flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center text-base sm:text-lg bg-green-500/15 text-green-500">
                        W
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-foreground">WhatsApp Business</h3>
                        <div className="mt-1 flex items-center gap-2">
                          {whatsappAccounts.filter(a => a.status === 'connected').length > 0 ? (
                            <>
                              <div className="h-1.5 w-1.5 rounded-full bg-chart-positive" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.4)' }} />
                              <span className="text-xs font-bold text-chart-positive">CONECTADO</span>
                            </>
                          ) : (
                            <>
                              <div className="h-1.5 w-1.5 rounded-full bg-border" />
                              <span className="text-xs font-bold text-muted-foreground">SEM INSTÂNCIAS</span>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground font-mono">
                            · {whatsappAccounts.filter(a => a.status === 'connected').length} instância(s)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 flex-col sm:flex-row sm:items-center">
                      <div className="flex flex-col w-full sm:w-64">
                        <select
                          className="h-9 w-full rounded-md border border-input bg-surface px-3 py-1 text-sm shadow-xs text-foreground"
                          value={selectedWhatsappClient || ""}
                          onChange={(e) => setSelectedWhatsappClient(e.target.value || null)}
                        >
                          <option value="">Conectar p/ qual cliente?</option>
                          {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.client_label}</option>
                          ))}
                        </select>
                      </div>
                      <Button
                        size="sm"
                        className="h-9 whitespace-nowrap"
                        disabled={!selectedWhatsappClient || connecting === "whatsapp"}
                        onClick={() => handleConnectWhatsApp(selectedWhatsappClient)}
                      >
                        {connecting === "whatsapp" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Conectar
                      </Button>
                    </div>
                  </div>

                  {whatsappAccounts.length > 0 && (
                    <div className="bg-muted/10 p-4 sm:p-6">
                      <div className="space-y-3">
                        {whatsappAccounts.map((acc) => {
                          const client = clients.find(c => c.id === acc.client_id);
                          const clientName = client ? client.client_label : "Agência (Global)";
                          return (
                            <div key={acc.id} className="flex items-center justify-between rounded-lg bg-background border border-border/30 p-3">
                              <div className="flex items-center gap-3">
                                {acc.status === "connected" ? (
                                  <div className="h-2 w-2 rounded-full bg-chart-positive" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.4)' }} />
                                ) : (
                                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-foreground">{clientName}</p>
                                  {acc.status === "connected" && (
                                    <p className="text-xs text-muted-foreground font-mono">{acc.instance_name}</p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDisconnectWhatsApp(acc.client_id)}
                              >
                                Desconectar
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            const expired = isTokenExpired(conn.provider);
            const lastSync = getLastSyncDate(accounts);

            return (
              <div key={conn.provider} className="connection-row p-0 animate-slide-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="connection-avatar flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center text-base sm:text-lg">
                      {providerInfo.label.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-bold text-foreground">{providerInfo.label}</h3>
                        {conn.connected && expired && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Token expirado
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {conn.connected ? (
                          <>
                            <div className="h-1.5 w-1.5 rounded-full bg-chart-positive" style={{ boxShadow: '0 0 6px rgba(74,222,128,0.4)' }} />
                            <span className="text-xs font-bold text-chart-positive">CONECTADO</span>
                            {(isGoogle || isMeta || isGA4) && (
                              <span className="text-xs text-muted-foreground ml-2 font-mono">
                                · {accounts.filter(a => a.is_active).length} ativa(s)
                              </span>
                            )}
                            {lastSync && (
                              <span className="text-xs text-muted-foreground ml-1 font-mono">
                                · Sincronizado {lastSync}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="h-1.5 w-1.5 rounded-full bg-border" />
                            <span className="text-xs font-bold text-muted-foreground">NÃO CONECTADO</span>
                          </>
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
                      <div className="flex items-center gap-2">
                        {expired && (
                          <Button size="sm" variant="outline" onClick={() => handleConnect(conn.provider)} className="gap-1 text-destructive border-destructive/30 hover:bg-destructive/10">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Reconectar
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDisconnect(conn.provider)}>Desconectar</Button>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => handleConnect(conn.provider)} disabled={connecting === conn.provider}>
                        {connecting === conn.provider && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Conectar
                      </Button>
                    )}
                  </div>
                </div>

                {conn.connected && conn.expanded && isGoogle && googleAccounts.length > 0 &&
                  renderAccountList(googleAccounts, "google_ads", toggleGoogleAccount, saveGoogleAccounts, "google_ads", "contas")}

                {conn.connected && conn.expanded && isMeta && metaAccounts.length > 0 &&
                  renderAccountList(metaAccounts, "meta_ads", toggleMetaAccount, saveMetaAccounts, "meta_ads", "contas")}

                {conn.connected && conn.expanded && isGA4 && ga4Accounts.length > 0 &&
                  renderAccountList(ga4Accounts, "ga4", toggleGA4Account, saveGA4Accounts, "ga4", "propriedades")}
              </div>
            );
          })}
        </div>

        {/* WhatsApp QR Code Modal */}
        <Dialog open={waQrModalOpen} onOpenChange={(open) => {
          if (!open && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
            setWaPolling(false);
          }
          setWaQrModalOpen(open);
        }}>
          <DialogContent className="sm:max-w-md bg-surface border border-border2">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-sm font-medium">
                <QrCode className="h-5 w-5 text-green-500" />
                Escaneie com o WhatsApp de {selectedWhatsappClient ? clients.find(c => c.id === selectedWhatsappClient)?.client_label : "Agência"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-4">
              {waQrLoading ? (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
                </div>
              ) : waQrCode ? (
                <>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <img
                      src={waQrCode.startsWith("data:") ? waQrCode : `data:image/png;base64,${waQrCode}`}
                      alt="WhatsApp QR Code"
                      className="h-64 w-64 object-contain"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      Expira em ~45s
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Abra o WhatsApp → Menu (⋮) → Aparelhos conectados → Conectar
                    </p>
                  </div>
                  {waPolling && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Aguardando conexão...
                    </div>
                  )}
                </>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Não foi possível gerar o QR Code. Feche e tente novamente.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
