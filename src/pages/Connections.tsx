import { useState, useEffect, useCallback } from "react";
import { Plug, CheckCircle2, XCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSearchParams } from "react-router-dom";

interface Account {
  id: string;
  name: string;
  selected: boolean;
}

interface Connection {
  id: string;
  provider: string;
  connected: boolean;
  account_data: Account[];
  expanded: boolean;
}

const PROVIDERS = [
  { id: "google_ads", label: "Google Ads", icon: "G", colorClass: "bg-chart-blue/15 text-chart-blue" },
  { id: "meta_ads", label: "Meta Ads", icon: "M", colorClass: "bg-chart-purple/15 text-chart-purple" },
  { id: "ga4", label: "Google Analytics 4", icon: "A", colorClass: "bg-chart-amber/15 text-chart-amber" },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>(
    PROVIDERS.map((p) => ({ id: "", provider: p.id, connected: false, account_data: [], expanded: false }))
  );
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  const fetchConnections = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/manage-connections`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dm91Z2NjYnNybnJ0bnNnZXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTM2NjAsImV4cCI6MjA4NjUyOTY2MH0.lvUClvJaQRx2YGccRJwLMYpIudf9d-JE9dDwZkq0qh8",
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({}),
        }
      );
      const { connections: dbConns } = await res.json();

      setConnections(
        PROVIDERS.map((p) => {
          const dbConn = dbConns?.find((c: { provider: string }) => c.provider === p.id);
          return {
            id: dbConn?.id || "",
            provider: p.id,
            connected: dbConn?.connected || false,
            account_data: (dbConn?.account_data as Account[]) || [],
            expanded: false,
          };
        })
      );
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

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
      if (!session) {
        toast.error("Faça login primeiro");
        return;
      }

      const res = await fetch(
        `https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/oauth-init`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dm91Z2NjYnNybnJ0bnNnZXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTM2NjAsImV4cCI6MjA4NjUyOTY2MH0.lvUClvJaQRx2YGccRJwLMYpIudf9d-JE9dDwZkq0qh8",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ provider }),
        }
      );

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Erro ao iniciar conexão");
      }
    } catch (err) {
      toast.error("Erro ao conectar");
      console.error(err);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase
      .from("oauth_connections")
      .delete()
      .eq("manager_id", session.user.id)
      .eq("provider", provider);

    if (error) {
      toast.error("Erro ao desconectar");
    } else {
      toast.success("Desconectado");
      fetchConnections();
    }
  };

  const toggleExpand = (provider: string) => {
    setConnections((prev) =>
      prev.map((c) => (c.provider === provider ? { ...c, expanded: !c.expanded } : c))
    );
  };

  const toggleAccount = (provider: string, accId: string) => {
    setConnections((prev) =>
      prev.map((c) =>
        c.provider === provider
          ? {
              ...c,
              account_data: c.account_data.map((a) =>
                a.id === accId ? { ...a, selected: !a.selected } : a
              ),
            }
          : c
      )
    );
  };

  const saveAccounts = async (provider: string) => {
    const conn = connections.find((c) => c.provider === provider);
    if (!conn) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch(
      `https://uwvougccbsrnrtnsgert.supabase.co/functions/v1/manage-connections`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV3dm91Z2NjYnNybnJ0bnNnZXJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTM2NjAsImV4cCI6MjA4NjUyOTY2MH0.lvUClvJaQRx2YGccRJwLMYpIudf9d-JE9dDwZkq0qh8",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ provider, account_data: conn.account_data }),
      }
    );

    const data = await res.json();
    if (data.success) {
      const count = conn.account_data.filter((a) => a.selected).length;
      toast.success(`${count} conta(s) salva(s)`);
    } else {
      toast.error("Erro ao salvar");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="ml-64 flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="ml-64 p-8">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <Plug className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Central de Conexões</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas integrações com plataformas de anúncios e analytics
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {connections.map((conn, i) => {
            const providerInfo = PROVIDERS.find((p) => p.id === conn.provider)!;
            return (
              <div
                key={conn.provider}
                className="card-executive overflow-hidden animate-slide-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-center justify-between p-6">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${providerInfo.colorClass}`}
                    >
                      {providerInfo.icon}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{providerInfo.label}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        {conn.connected ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-chart-positive" />
                            <span className="text-xs font-medium text-chart-positive">Conectado</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">
                              Não conectado
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {conn.connected && (
                      <Button variant="ghost" size="sm" onClick={() => toggleExpand(conn.provider)}>
                        {conn.expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    {conn.connected ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDisconnect(conn.provider)}
                      >
                        Desconectar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleConnect(conn.provider)}
                        disabled={connecting === conn.provider}
                      >
                        {connecting === conn.provider ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Conectar {providerInfo.label}
                      </Button>
                    )}
                  </div>
                </div>

                {conn.connected && conn.expanded && conn.account_data.length > 0 && (
                  <div className="border-t border-border bg-muted/30 p-6">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {conn.provider === "ga4"
                        ? "Selecione a propriedade"
                        : "Selecione as contas ativas"}
                    </p>
                    <div className="space-y-2">
                      {conn.account_data.map((acc) => (
                        <label
                          key={acc.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50"
                        >
                          <Checkbox
                            checked={acc.selected}
                            onCheckedChange={() => toggleAccount(conn.provider, acc.id)}
                          />
                          <span className="text-sm text-foreground">{acc.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button size="sm" onClick={() => saveAccounts(conn.provider)}>
                        Salvar Seleção
                      </Button>
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
