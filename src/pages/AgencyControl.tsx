import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ListChecks,
  Plus,
  Search,
  Download,
  MoreHorizontal,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
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

  return (
    <div className="space-y-4">
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
                <p className={`text-sm font-medium truncate flex items-center gap-1.5 ${task.status === "DONE" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {task.auto_generated && (
                    <span className="shrink-0 text-blue-500" title="Gerado por IA">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
                    </span>
                  )}
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

/* ── Optimization badge summary ── */
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
  const queryClient = useQueryClient();

  const { data: queryData, isLoading: loading } = useQuery({
    queryKey: ["agencyClients"],
    queryFn: async () => {
      const result = await callManageClients({ action: "list" });
      return { clients: result.clients || [] as ClientLink[], availableAccounts: result.available_accounts || { google: [], meta: [], ga4: [] } as AvailableAccounts };
    },
    staleTime: 2 * 60 * 1000,
  });

  const clients = queryData?.clients ?? [];
  const availableAccounts = queryData?.availableAccounts ?? { google: [], meta: [], ga4: [] };
  const refetchClients = () => queryClient.invalidateQueries({ queryKey: ["agencyClients"] });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  // Optimization counts
  const clientIds = useMemo(() => clients.map((c) => c.id), [clients]);
  const { counts: optCounts, refetchCounts } = useOptimizationCounts(clientIds);

  // Filtered clients
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (c) =>
        (c.client_label || "").toLowerCase().includes(q) ||
        (c.full_name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const allSelected = filteredClients.length > 0 && filteredClients.every((c) => selectedIds.has(c.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExportCSV = () => {
    const rows = filteredClients.map((c) => ({
      Nome: c.client_label || c.full_name || "",
      Email: c.email || "",
      Contas: (c.google_accounts?.length || 0) + (c.meta_accounts?.length || 0) + (c.ga4_properties?.length || 0),
      Criado: new Date(c.created_at).toLocaleDateString("pt-BR"),
    }));
    const csv = [Object.keys(rows[0] || {}).join(","), ...rows.map((r) => Object.values(r).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clientes.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

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
        refetchClients();
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
        refetchClients();
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
        refetchClients();
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

  const getStatusBadge = (client: ClientLink) => {
    const accountCount =
      (client.google_accounts?.length || 0) +
      (client.meta_accounts?.length || 0) +
      (client.ga4_properties?.length || 0);
    if (accountCount > 0) {
      return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/20">Ativo</Badge>;
    }
    return <Badge variant="outline" className="text-muted-foreground">Pendente</Badge>;
  };

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
                  <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome do cliente" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Label / Empresa
                  </label>
                  <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex: TechBrasil" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Email
                  </label>
                  <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="cliente@email.com" required />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Senha
                  </label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={creating} className="gap-2">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Criar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Cards */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          <div className="card-executive p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Clientes</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{totalClients}</p>
          </div>

          <div className="card-executive p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <Link2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clientes com Contas Ativas</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{clientsWithAccounts}</p>
          </div>

          <div className="card-executive p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-purple/15 text-chart-purple">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total de Contas</span>
            </div>
            <p className="text-3xl font-extrabold tracking-tight text-foreground">{totalAccounts}</p>
          </div>
        </div>

        {/* Table section */}
        <div className="card-executive overflow-hidden animate-fade-in">
          {/* Table toolbar */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={handleExportCSV} disabled={filteredClients.length === 0}>
              <Download className="h-3.5 w-3.5" />
              Exportar
            </Button>
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-muted mb-4">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground mb-4">
                {searchQuery ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <UserPlus className="h-4 w-4" />
                  Criar Primeiro Cliente
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                    <TableHead className="hidden sm:table-cell text-center">Contas</TableHead>
                    <TableHead className="hidden lg:table-cell text-center">Otimizações</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => {
                    const accountCount =
                      (client.google_accounts?.length || 0) +
                      (client.meta_accounts?.length || 0) +
                      (client.ga4_properties?.length || 0);
                    const isExpanded = expandedId === client.id;
                    const isEditing = editingId === client.id;

                    return (
                      <>
                        <TableRow
                          key={client.id}
                          className="cursor-pointer group"
                          data-state={selectedIds.has(client.id) ? "selected" : undefined}
                          onClick={() => setExpandedId(isExpanded ? null : client.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedIds.has(client.id)}
                              onCheckedChange={() => toggleSelect(client.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                {getInitials(client.full_name, client.email)}
                              </div>
                              <div className="min-w-0">
                                {isEditing ? (
                                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <Input
                                      value={editLabel}
                                      onChange={(e) => setEditLabel(e.target.value)}
                                      className="h-7 text-sm w-40"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSaveLabel(client.id);
                                        if (e.key === "Escape") setEditingId(null);
                                      }}
                                    />
                                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handleSaveLabel(client.id)} disabled={savingLabel}>
                                      {savingLabel ? <Loader2 className="h-3 w-3 animate-spin" /> : "OK"}
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {client.client_label || client.full_name || "Sem nome"}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground truncate md:hidden">{client.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-sm text-muted-foreground">{client.email || "—"}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="text-sm text-muted-foreground">{client.client_label || "—"}</span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center">
                            <Badge variant="secondary" className="text-[11px]">
                              {accountCount}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-center">
                            <OptimizationBadgesDisplay counts={optCounts[client.id]} />
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {getStatusBadge(client)}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setEditingId(client.id);
                                  setEditLabel(client.client_label || client.full_name || "");
                                }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" />
                                  Editar label
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setOptModalClientId(client.id);
                                  setOptModalLabel(client.client_label || client.full_name || "Cliente");
                                }}>
                                  <ListChecks className="h-3.5 w-3.5 mr-2" />
                                  Otimizações
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/preview?client=${client.client_user_id}`)}>
                                  <Eye className="h-3.5 w-3.5 mr-2" />
                                  Ver dashboard
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate(`/clients/${client.client_user_id}/reports/new`)}>
                                  <FileText className="h-3.5 w-3.5 mr-2" />
                                  Criar relatório
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => handleDelete(client.id)}>
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Remover
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>

                        {/* Expanded row */}
                        {isExpanded && (
                          <TableRow key={`${client.id}-expanded`} className="hover:bg-transparent">
                            <TableCell colSpan={8} className="p-0">
                              <div className="border-t border-border bg-muted/30 px-6 py-5 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <ClientWhatsAppConnect
                                    clientId={client.client_user_id}
                                    clientLabel={client.client_label || client.full_name || "Cliente"}
                                  />
                                </div>
                                <div className="flex items-center gap-2 mb-4">
                                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <Link2 className="h-3.5 w-3.5" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">Contas de Anúncios Vinculadas</p>
                                    <p className="text-xs text-muted-foreground">Selecione quais contas este cliente pode visualizar</p>
                                  </div>
                                </div>
                                <ClientAccountConfig
                                  clientUserId={client.client_user_id}
                                  clientLabel={client.client_label || client.full_name || "Cliente"}
                                  assignedGoogle={client.google_accounts || []}
                                  assignedMeta={client.meta_accounts || []}
                                  assignedGA4={client.ga4_properties || []}
                                  available={availableAccounts}
                                  onSaved={refetchClients}
                                />
                                <WhatsAppReportConfig clientId={client.client_user_id} />
                                <BalanceAlertConfig clientId={client.client_user_id} />
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </>
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
