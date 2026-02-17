import { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  UserPlus,
  Trash2,
  Loader2,
  Eye,
  FileText,
  Pencil,
  Users,
  Link2,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import ClientAccountConfig from "@/components/ClientAccountConfig";
import WhatsAppReportConfig from "@/components/WhatsAppReportConfig";
import BalanceAlertConfig from "@/components/BalanceAlertConfig";
import ClientWhatsAppConnect from "@/components/ClientWhatsAppConnect";
import { useOptimizationTasks } from "@/hooks/useOptimizationTasks";
import { useOptimizationCounts, type OptimizationCounts } from "@/hooks/useOptimizationCounts";

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
  const {
    data: { session },
  } = await supabase.auth.getSession();
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

function getInitials(name?: string | null, email?: string | null) {
  const source = name || email || "C";
  return source
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/* ── Optimization Tasks Modal ── */
function OptimizationModal({
  clientId,
  clientLabel,
  onChanged,
}: {
  clientId: string;
  clientLabel: string;
  onChanged?: () => void;
}) {
  const { tasks, loading, createTask, updateTaskStatus } =
    useOptimizationTasks(clientId);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    await createTask(newTitle.trim());
    setNewTitle("");
    setAdding(false);
    onChanged?.();
  };

  const statusColor: Record<string, string> = {
    TODO: "bg-yellow-500/15 text-yellow-600",
    IN_PROGRESS: "bg-blue-500/15 text-blue-600",
    DONE: "bg-green-500/15 text-green-600",
  };

  return (
    <div className="space-y-4">
      {/* Add new task */}
      <div className="flex gap-2">
        <Input
          placeholder="Nova otimização..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={adding || !newTitle.trim()} className="gap-1.5">
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Criar
        </Button>
      </div>

      {/* Task list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma otimização registrada para {clientLabel}.
        </p>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.status === "DONE" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {task.description}
                  </p>
                )}
              </div>
              <Select
                value={task.status}
                onValueChange={async (val) => {
                  await updateTaskStatus(task.id, val as "TODO" | "IN_PROGRESS" | "DONE");
                  onChanged?.();
                }}
              >
                <SelectTrigger className="h-7 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" /> TODO
                    </span>
                  </SelectItem>
                  <SelectItem value="IN_PROGRESS">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-blue-500" /> Em Progresso
                    </span>
                  </SelectItem>
                  <SelectItem value="DONE">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-green-500" /> Concluída
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Optimization badge summary (pure render, no fetch) ── */
function OptimizationBadgesDisplay({ counts }: { counts?: OptimizationCounts }) {
  if (!counts || (counts.todo + counts.inProgress + counts.done === 0)) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {counts.todo > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-yellow-500/40 text-yellow-600">
          {counts.todo}
        </Badge>
      )}
      {counts.inProgress > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-500/40 text-blue-600">
          {counts.inProgress}
        </Badge>
      )}
      {counts.done > 0 && (
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-500/40 text-green-600">
          {counts.done}
        </Badge>
      )}
    </div>
  );
}

export default function AgencyControl() {
  const navigate = useNavigate();

  const [clients, setClients] = useState<ClientLink[]>([]);
  const [availableAccounts, setAvailableAccounts] = useState<AvailableAccounts>({
    google: [],
    meta: [],
    ga4: [],
  });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create client form
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit label
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [savingLabel, setSavingLabel] = useState(false);

  // Optimization modal
  const [optModalClientId, setOptModalClientId] = useState<string | null>(null);
  const [optModalLabel, setOptModalLabel] = useState("");

  // Optimization counts (single query for all clients)
  const clientIds = useMemo(() => clients.map((c) => c.id), [clients]);
  const { counts: optCounts, refetchCounts } = useOptimizationCounts(clientIds);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callManageClients({ action: "list" });
      if (result.clients) setClients(result.clients);
      if (result.available_accounts) setAvailableAccounts(result.available_accounts);
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreate = async (e: React.FormEvent) => {
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
        setNewEmail("");
        setNewPassword("");
        setNewName("");
        setNewLabel("");
        setCreateOpen(false);
        fetchClients();
      }
    } catch {
      toast.error("Erro ao criar cliente");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (linkId: string) => {
    try {
      const result = await callManageClients({ action: "delete", link_id: linkId });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Vínculo removido");
        fetchClients();
      }
    } catch {
      toast.error("Erro ao remover cliente");
    }
  };

  const handleSaveLabel = async (linkId: string) => {
    setSavingLabel(true);
    try {
      const result = await callManageClients({
        action: "update",
        link_id: linkId,
        client_label: editLabel,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Label atualizado!");
        setEditingId(null);
        fetchClients();
      }
    } catch {
      toast.error("Erro ao atualizar label");
    } finally {
      setSavingLabel(false);
    }
  };

  // KPI calculations
  const totalClients = clients.length;
  const clientsWithAccounts = useMemo(
    () =>
      clients.filter(
        (c) =>
          (c.google_accounts?.length || 0) +
          (c.meta_accounts?.length || 0) +
          (c.ga4_properties?.length || 0) >
          0
      ).length,
    [clients]
  );
  const totalAccounts = useMemo(
    () =>
      clients.reduce(
        (sum, c) =>
          sum +
          (c.google_accounts?.length || 0) +
          (c.meta_accounts?.length || 0) +
          (c.ga4_properties?.length || 0),
        0
      ),
    [clients]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Gestão de Clientes</h1>
              <p className="text-sm text-muted-foreground">Gerencie contas, acessos e estrutura operacional</p>
            </div>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="h-4 w-4" />
                + Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Cliente</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nome Completo
                  </label>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome do cliente"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Label / Empresa
                  </label>
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Ex: TechBrasil"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="cliente@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Senha
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating} className="gap-2">
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    Criar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
          <div className="card-executive p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Clientes
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{totalClients}</p>
          </div>

          <div className="card-executive p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Link2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Clientes com Contas Ativas
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">
              {clientsWithAccounts}
            </p>
          </div>

          <div className="card-executive p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-purple/15 text-chart-purple">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total de Contas
              </span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{totalAccounts}</p>
          </div>
        </div>

        {/* Client List */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : clients.length === 0 ? (
            <div className="card-executive p-12 text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-muted mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-4">
                Nenhum cliente cadastrado ainda.
              </p>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Criar Primeiro Cliente
              </Button>
            </div>
          ) : (
            clients.map((client) => {
              const accountCount =
                (client.google_accounts?.length || 0) +
                (client.meta_accounts?.length || 0) +
                (client.ga4_properties?.length || 0);
              const isExpanded = expandedId === client.id;
              const isEditing = editingId === client.id;

              return (
                <div key={client.id} className="card-executive overflow-hidden">
                  {/* Client header row */}
                  <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {getInitials(client.full_name, client.email)}
                    </div>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="h-8 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveLabel(client.id);
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSaveLabel(client.id)}
                            disabled={savingLabel}
                          >
                            {savingLabel ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Salvar"
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground truncate">
                            {client.client_label || client.full_name || "Sem nome"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                        </>
                      )}
                    </div>

                    {/* Optimization badges */}
                    <div className="hidden sm:flex flex-col items-center gap-0.5 shrink-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Otimizações
                      </span>
                      <OptimizationBadgesDisplay counts={optCounts[client.id]} />
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* WhatsApp connection per client */}
                      <ClientWhatsAppConnect
                        clientId={client.client_user_id}
                        clientLabel={client.client_label || client.full_name || "Cliente"}
                      />

                      <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                        {accountCount} conta{accountCount !== 1 ? "s" : ""}
                      </Badge>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Gerenciar otimizações"
                        onClick={() => {
                          setOptModalClientId(client.id);
                          setOptModalLabel(client.client_label || client.full_name || "Cliente");
                        }}
                      >
                        <ListChecks className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Editar label"
                        onClick={() => {
                          setEditingId(client.id);
                          setEditLabel(client.client_label || client.full_name || "");
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Ver dashboard"
                        onClick={() => navigate(`/preview?client=${client.client_user_id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Criar relatório"
                        onClick={() => navigate(`/clients/${client.client_user_id}/reports/new`)}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Remover vínculo"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : client.id)}
                        className="ml-1 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: account config */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-4 sm:px-6">
                      <ClientAccountConfig
                        clientUserId={client.client_user_id}
                        clientLabel={client.client_label || client.full_name || "Cliente"}
                        assignedGoogle={client.google_accounts || []}
                        assignedMeta={client.meta_accounts || []}
                        assignedGA4={client.ga4_properties || []}
                        available={availableAccounts}
                        onSaved={fetchClients}
                      />
                      <WhatsAppReportConfig clientId={client.client_user_id} />
                      <BalanceAlertConfig clientId={client.client_user_id} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Optimization Tasks Modal */}
      <Dialog
        open={!!optModalClientId}
        onOpenChange={(open) => {
          if (!open) setOptModalClientId(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              Otimizações — {optModalLabel}
            </DialogTitle>
          </DialogHeader>
          {optModalClientId && (
            <OptimizationModal clientId={optModalClientId} clientLabel={optModalLabel} onChanged={refetchCounts} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
