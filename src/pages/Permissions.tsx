import { useState, useMemo, useEffect, useCallback } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { METRIC_DEFINITIONS, type MetricKey } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, Save, CheckCircle2, UserPlus, Trash2, Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import ClientAccountConfig from "@/components/ClientAccountConfig";

interface AvailableAccounts {
  google: Array<{ customer_id: string; account_name: string }>;
  meta: Array<{ ad_account_id: string; account_name: string }>;
  ga4: Array<{ property_id: string; name: string }>;
}

interface ClientLink {
  id: string;
  client_user_id: string;
  client_label: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  google_accounts: string[];
  meta_accounts: string[];
  ga4_properties: string[];
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

export default function PermissionsPage() {
  const { isMetricVisible, togglePermission, setAllPermissions, savePermissions, loadPermissionsForClient, loading: permLoading } = usePermissions();
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientLink[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<AvailableAccounts>({ google: [], meta: [], ga4: [] });
  const [clientsLoading, setClientsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const fetchClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const result = await callManageClients({ action: "list" });
      if (result.clients) setClients(result.clients);
      if (result.available_accounts) setAvailableAccounts(result.available_accounts);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // Auto-select first client
  useEffect(() => {
    if (clients.length > 0 && !clients.some((c) => c.client_user_id === selectedClientId)) {
      setSelectedClientId(clients[0].client_user_id);
    }
  }, [clients, selectedClientId]);

  // Load permissions when client changes
  useEffect(() => {
    if (selectedClientId) {
      loadPermissionsForClient(selectedClientId);
    }
  }, [selectedClientId, loadPermissionsForClient]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await callManageClients({
        action: "create",
        email: newEmail,
        password: newPassword,
        full_name: newName,
        client_label: newLabel || newName || newEmail,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Cliente criado com sucesso!");
        setNewEmail(""); setNewPassword(""); setNewName(""); setNewLabel("");
        setShowCreateForm(false);
        fetchClients();
      }
    } catch (err) {
      toast.error("Erro ao criar cliente");
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClient = async (linkId: string) => {
    try {
      const result = await callManageClients({ action: "delete", link_id: linkId });
      if (result.error) { toast.error(result.error); } else { toast.success("Vínculo removido"); fetchClients(); }
    } catch { toast.error("Erro ao remover cliente"); }
  };

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

  const groupedMetrics = useMemo(() => {
    const groups: Record<string, typeof METRIC_DEFINITIONS> = {};
    METRIC_DEFINITIONS.forEach((m) => {
      if (!groups[m.module]) groups[m.module] = [];
      groups[m.module].push(m);
    });
    return groups;
  }, []);

  const selectedClient = clients.find((c) => c.client_user_id === selectedClientId);
  const visibleCount = METRIC_DEFINITIONS.filter((m) => isMetricVisible(selectedClientId, m.key)).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-16 lg:pt-6 lg:ml-64 p-4 sm:p-6 lg:px-8">
        <div className="mb-6 lg:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Permissões e Clientes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Gerencie clientes e configure métricas visíveis</p>
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

        {/* CLIENT MANAGEMENT */}
        <div className="mb-8 lg:mb-10 space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-foreground">Gerenciar Clientes</h2>
            </div>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowCreateForm(!showCreateForm)}>
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Cliente</span>
            </Button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateClient} className="card-executive p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Criar Novo Cliente</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome Completo</label>
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do cliente" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Label / Empresa</label>
                  <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: TechBrasil" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="cliente@email.com" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Senha</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setShowCreateForm(false)}>Cancelar</Button>
                <Button type="submit" disabled={creating} className="gap-2">
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Criar
                </Button>
              </div>
            </form>
          )}

          <div className="card-executive divide-y divide-border">
            {clientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : clients.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum cliente cadastrado. Clique em "Novo Cliente" para começar.
              </div>
            ) : (
              clients.map((c) => (
                <div key={c.id}>
                  <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {(c.full_name || c.email || "C").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.client_label || c.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDeleteClient(c.id)} className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <ClientAccountConfig
                    clientUserId={c.client_user_id}
                    clientLabel={c.client_label || c.full_name || "Cliente"}
                    assignedGoogle={c.google_accounts || []}
                    assignedMeta={c.meta_accounts || []}
                    assignedGA4={c.ga4_properties || []}
                    available={availableAccounts}
                    onSaved={fetchClients}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* PERMISSIONS */}
        {clients.length > 0 && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Eye className="h-4 w-4" />
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground">Permissões de Métricas</h2>
              </div>
            </div>

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
                    <span className="text-xs sm:text-sm font-medium text-foreground">{visibleCount}/{METRIC_DEFINITIONS.length} ativas</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setAllPermissions(selectedClientId, true)}>Ativar Todas</Button>
                  <Button variant="ghost" size="sm" onClick={() => setAllPermissions(selectedClientId, false)}>Desativar Todas</Button>
                </div>

                {permLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4 lg:space-y-6">
                    {Object.entries(groupedMetrics).map(([module, metrics], gi) => (
                      <div key={module} className="card-executive p-4 sm:p-6 animate-slide-up" style={{ animationDelay: `${150 + gi * 80}ms` }}>
                        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{module}</h3>
                        <div className="space-y-2 sm:space-y-3">
                          {metrics.map((m) => (
                            <div key={m.key} className="flex items-center justify-between rounded-lg border border-border/50 p-3 sm:p-4 transition-colors hover:bg-muted/50">
                              <div className="min-w-0 mr-3">
                                <p className="text-sm font-medium text-foreground">{m.label}</p>
                                <p className="text-xs text-muted-foreground hidden sm:block">{m.description}</p>
                              </div>
                              <Switch checked={isMetricVisible(selectedClientId, m.key)} onCheckedChange={() => togglePermission(selectedClientId, m.key)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
