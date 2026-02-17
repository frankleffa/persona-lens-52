import { useState, useMemo, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { METRIC_DEFINITIONS, PLATFORM_GROUPS } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Eye, Save, CheckCircle2, Loader2, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "@/hooks/useSubscription";
import UpgradeBanner from "@/components/UpgradeBanner";

interface ClientLink {
  id: string;
  client_user_id: string;
  client_label: string;
  email: string | null;
  full_name: string | null;
}

async function callManageClients(body: Record<string, unknown>) {
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

const VISIBLE_PLATFORM_GROUPS = PLATFORM_GROUPS.filter((g) => g.id !== "legacy");

export default function PermissionsPage() {
  const { isMetricVisible, togglePermission, setAllPermissions, savePermissions, loadPermissionsForClient, loading: permLoading } = usePermissions();
  const { hasFeature, isLoading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientLink[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const result = await callManageClients({ action: "list" });
      if (result.clients) setClients(result.clients);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  useEffect(() => {
    if (clients.length > 0 && !clients.some((c) => c.client_user_id === selectedClientId)) {
      setSelectedClientId(clients[0].client_user_id);
    }
  }, [clients, selectedClientId]);

  useEffect(() => {
    if (selectedClientId) {
      loadPermissionsForClient(selectedClientId);
    }
  }, [selectedClientId, loadPermissionsForClient]);

  const handleSave = async () => {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      await savePermissions(selectedClientId);
      toast.success("Permissões salvas com sucesso!");
    } catch {
      toast.error("Erro ao salvar permissões");
    } finally {
      setSaving(false);
    }
  };

  const getGroupCounts = (group: typeof PLATFORM_GROUPS[0]) => {
    const total = group.metrics.length;
    const active = group.metrics.filter((k) => isMetricVisible(selectedClientId, k)).length;
    return { active, total };
  };

  const totalVisible = useMemo(() => {
    const allPlatformKeys = VISIBLE_PLATFORM_GROUPS.flatMap((g) => g.metrics);
    return allPlatformKeys.filter((k) => isMetricVisible(selectedClientId, k)).length;
  }, [selectedClientId, isMetricVisible]);

  const totalMetrics = useMemo(() => VISIBLE_PLATFORM_GROUPS.reduce((sum, g) => sum + g.metrics.length, 0), []);

  // Feature guard — all hooks called above
  if (!subLoading && !hasFeature("granular_permissions")) {
    return <UpgradeBanner feature="Permissões Granulares" description="Controle quais métricas cada cliente pode visualizar no dashboard." />;
  }
  if (clientsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
          <div className="card-executive p-12 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum cliente cadastrado. Crie clientes no <strong>Agency Control</strong> primeiro.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
        <div className="mb-6 lg:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Permissões de Métricas</h1>
              <p className="mt-1 text-sm text-muted-foreground">Configure quais métricas cada cliente pode visualizar</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" onClick={() => navigate(`/preview?client=${selectedClientId}`)} className="gap-2 text-xs sm:text-sm" disabled={!selectedClientId}>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Pré-visualizar</span>
            </Button>
            <Button onClick={handleSave} disabled={saving || !selectedClientId} className="gap-2 text-xs sm:text-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar
            </Button>
          </div>
        </div>

        {/* Client selector */}
        <div className="mb-6 lg:mb-8 flex flex-wrap gap-2 sm:gap-3 animate-slide-up">
          {clients.map((c) => (
            <button
              key={c.client_user_id}
              onClick={() => setSelectedClientId(c.client_user_id)}
              className={`flex items-center gap-2 sm:gap-3 rounded-xl border px-3 py-2 sm:px-4 sm:py-3 transition-all ${
                selectedClientId === c.client_user_id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-primary text-xs sm:text-sm font-semibold text-primary-foreground">
                {(c.full_name || c.email || "C").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-foreground">{c.client_label || c.full_name || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{c.email}</p>
              </div>
            </button>
          ))}
        </div>

        {selectedClientId && (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2 sm:gap-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium text-foreground">{totalVisible}/{totalMetrics} ativas</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAllPermissions(selectedClientId, true)}>Ativar Todas</Button>
              <Button variant="ghost" size="sm" onClick={() => setAllPermissions(selectedClientId, false)}>Desativar Todas</Button>
            </div>

            {permLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={VISIBLE_PLATFORM_GROUPS.map((g) => g.id)} className="space-y-3">
                {VISIBLE_PLATFORM_GROUPS.map((group, gi) => {
                  const { active, total } = getGroupCounts(group);
                  return (
                    <AccordionItem
                      key={group.id}
                      value={group.id}
                      className="card-executive border rounded-xl overflow-hidden animate-slide-up"
                      style={{ animationDelay: `${150 + gi * 80}ms` }}
                    >
                      <AccordionTrigger className="px-4 sm:px-6 py-3 sm:py-4 hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold ${group.colorClass}`}>
                            {group.icon}
                          </div>
                          <span className="text-sm sm:text-base font-semibold text-foreground">{group.label}</span>
                          <Badge variant={active === total ? "default" : "secondary"} className="ml-auto mr-2 text-xs">
                            {active}/{total}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 sm:px-6 pb-4">
                        <div className="space-y-2">
                          {group.metrics.map((metricKey) => {
                            const def = METRIC_DEFINITIONS.find((m) => m.key === metricKey);
                            if (!def) return null;
                            return (
                              <div key={metricKey} className="flex items-center justify-between rounded-lg border border-border/50 p-3 sm:p-4 transition-colors hover:bg-muted/50">
                                <div className="min-w-0 mr-3">
                                  <p className="text-sm font-medium text-foreground">{def.label}</p>
                                  <p className="text-xs text-muted-foreground hidden sm:block">{def.description}</p>
                                </div>
                                <Switch checked={isMetricVisible(selectedClientId, metricKey)} onCheckedChange={() => togglePermission(selectedClientId, metricKey)} />
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </>
        )}
      </div>
    </div>
  );
}
