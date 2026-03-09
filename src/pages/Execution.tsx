import { useState, useMemo, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { differenceInDays, parseISO } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, X, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { CampaignCard } from "@/components/CampaignCard";
import { CampaignDrawer } from "@/components/CampaignDrawer";
import { KanbanColumnHeader } from "@/components/execution/KanbanColumnHeader";
import type { Campaign, CampaignStatus, Platform, Label } from "@/lib/execution-types";
import { COLUMN_CONFIG, DEFAULT_CHECKLIST } from "@/lib/execution-types";
import {
  DndContext, DragOverlay, pointerWithin, PointerSensor, KeyboardSensor, useSensor, useSensors,
  useDroppable, type DragStartEvent, type DragEndEvent, type DragOverEvent, type DragCancelEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useManagerClients } from "@/hooks/useManagerClients";
import { useTeamProfiles } from "@/hooks/useTeamProfiles";
import { useCampaignCommentCounts } from "@/hooks/useCampaignCommentCount";
import { Skeleton } from "@/components/ui/skeleton";

// ── Supabase → Campaign mapper ──
function mapDbToCampaign(row: Record<string, unknown>, clientName: string): Campaign {
  const rawLabels = row.labels;
  const labels: Label[] = Array.isArray(rawLabels)
    ? (rawLabels as Label[]).filter((l) => l && l.id && l.color)
    : [];

  return {
    id: row.id as string,
    client_id: row.client_id as string,
    client_name: clientName,
    campaign_name: row.campaign_name as string,
    platform: (row.platform as Platform) || "Meta Ads",
    objective: (row.objective as Campaign["objective"]) || "Conversão",
    budget: Number(row.budget) || 0,
    start_date: row.start_date as string,
    status: (row.status as CampaignStatus) || "PLANEJAMENTO",
    creatives: Array.isArray(row.creatives) ? (row.creatives as Campaign["creatives"]) : [],
    copy: (row.copy as Campaign["copy"]) || { headline: "", primary_text: "", description: "", cta: "Saiba Mais" },
    checklist: Array.isArray(row.checklist) ? (row.checklist as Campaign["checklist"]) : DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}` })),
    notes: (row.notes as string) || "",
    created_at: row.created_at as string,
    labels,
    description: (row.description as string) || (row.learning as string) || "",
    cover_url: (row.cover_url as string) || undefined,
    due_date: (row.due_date as string) || null,
    assigned_to: (row.assigned_to as string) || null,
    position: Number(row.position) || 0,
  };
}

function campaignToDb(c: Campaign) {
  return {
    client_id: c.client_id,
    campaign_name: c.campaign_name,
    platform: c.platform,
    objective: c.objective,
    budget: c.budget,
    start_date: c.start_date,
    status: c.status,
    creatives: c.creatives as unknown as import("@/integrations/supabase/types").Json,
    copy: c.copy as unknown as import("@/integrations/supabase/types").Json,
    checklist: c.checklist as unknown as import("@/integrations/supabase/types").Json,
    notes: c.notes,
    learning: c.description,
    description: c.description,
    labels: c.labels as unknown as import("@/integrations/supabase/types").Json,
    cover_url: c.cover_url || null,
    due_date: c.due_date || null,
    assigned_to: c.assigned_to || null,
    position: c.position,
  };
}

// ── Droppable Column Wrapper ──
function DroppableColumn({ status, children, isOver: isOverProp }: { status: string; children: React.ReactNode; isOver: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const active = isOverProp || isOver;
  return (
    <div
      ref={setNodeRef}
      data-column-id={status}
      className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[40px] rounded-lg transition-all duration-150"
      style={{
        background: active ? "hsl(var(--primary) / 0.06)" : undefined,
        boxShadow: active ? "inset 0 0 0 2px hsl(var(--primary) / 0.35), inset 0 0 24px hsl(var(--primary) / 0.08)" : "none",
      }}
    >
      {children}
    </div>
  );
}

// ── Sortable Card Wrapper (simplified, no framer-motion) ──
function SortableCard({
  campaign, onClick, onUpdateName, assigneeName, commentCount,
}: {
  campaign: Campaign; onClick: () => void; onUpdateName: (id: string, name: string) => void;
  assigneeName?: string | null; commentCount?: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: campaign.id });
  
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 180ms ease",
    opacity: isDragging ? 0 : 1,
    pointerEvents: isDragging ? "none" : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {isDragging ? (
        // Placeholder with dynamic height based on content
        <div
          className="rounded-lg"
          style={{
            border: "2px dashed hsl(var(--primary) / 0.4)",
            background: "hsl(var(--primary) / 0.06)",
            borderRadius: 8,
            minHeight: 64,
          }}
        />
      ) : (
        <CampaignCard
          campaign={campaign} onClick={onClick} onUpdateName={onUpdateName}
          isDragging={false} assigneeName={assigneeName} commentCount={commentCount}
        />
      )}
    </div>
  );
}

export default function Execution() {
  const queryClient = useQueryClient();
  const { clients: managerClients } = useManagerClients();
  const { data: teamProfiles = [] } = useTeamProfiles();
  const clientMap = useMemo(() => new Map(managerClients.map((c) => [c.id, c.client_label || "Cliente"])), [managerClients]);
  const profileMap = useMemo(() => new Map(teamProfiles.map((p) => [p.id, p.full_name || p.email || "Usuário"])), [teamProfiles]);

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["execution-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase.from("strategic_campaigns").select("*").order("position", { ascending: true });
      if (error) throw error;
      return (data || []).map((row) => mapDbToCampaign(row, clientMap.get(row.client_id) || "Cliente"));
    },
    enabled: managerClients.length > 0,
  });

  const campaignIds = useMemo(() => campaigns.map((c) => c.id), [campaigns]);
  const { data: commentCounts = {} } = useCampaignCommentCounts(campaignIds);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["execution-campaigns"] });

  // Realtime: listen for new comments
  useEffect(() => {
    const channel = supabase
      .channel("campaign-comments-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "campaign_comments" },
        async (payload) => {
          const newComment = payload.new as { campaign_id: string; user_id: string; content: string };
          const campaign = campaigns.find((c) => c.id === newComment.campaign_id);
          const campaignName = campaign?.campaign_name || "uma campanha";

          // Fetch commenter name
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", newComment.user_id)
            .single();
          const userName = profile?.full_name || profile?.email || "Alguém";

          toast.info(`💬 ${userName} comentou em "${campaignName}"`, {
            description: newComment.content.slice(0, 80) + (newComment.content.length > 80 ? "..." : ""),
            duration: 5000,
          });

          // Refresh comment counts
          queryClient.invalidateQueries({ queryKey: ["campaign-comment-counts"] });
          queryClient.invalidateQueries({ queryKey: ["campaign-comments", newComment.campaign_id] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [campaigns, queryClient]);

  const createMutation = useMutation({
    mutationFn: async (c: Campaign) => {
      const { error } = await supabase.from("strategic_campaigns").insert(campaignToDb(c));
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: async (c: Campaign) => {
      const { error } = await supabase.from("strategic_campaigns").update(campaignToDb(c)).eq("id", c.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("strategic_campaigns").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addingInColumn, setAddingInColumn] = useState<CampaignStatus | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const newCardRef = useRef<HTMLTextAreaElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterDueStatus, setFilterDueStatus] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [collapsedColumns, setCollapsedColumns] = useState<Set<CampaignStatus>>(new Set());

  useEffect(() => { if (addingInColumn && newCardRef.current) newCardRef.current.focus(); }, [addingInColumn]);

  const filteredCampaigns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return campaigns.filter((c) => {
      if (filterClient !== "all" && c.client_id !== filterClient) return false;
      if (filterPlatform !== "all" && c.platform !== filterPlatform) return false;
      if (searchText && !c.campaign_name.toLowerCase().includes(searchText.toLowerCase())) return false;
      if (filterAssignee !== "all") {
        if (filterAssignee === "unassigned" && c.assigned_to) return false;
        if (filterAssignee !== "unassigned" && c.assigned_to !== filterAssignee) return false;
      }
      if (filterDueStatus !== "all") {
        if (filterDueStatus === "no_date" && c.due_date) return false;
        if (filterDueStatus === "no_date" && !c.due_date) return true;
        if (!c.due_date) return false;
        const due = parseISO(c.due_date);
        due.setHours(0, 0, 0, 0);
        const diff = differenceInDays(due, today);
        if (filterDueStatus === "overdue" && diff >= 0) return false;
        if (filterDueStatus === "today" && diff !== 0) return false;
        if (filterDueStatus === "on_time" && diff <= 0) return false;
      }
      return true;
    });
  }, [campaigns, filterClient, filterPlatform, searchText, filterAssignee, filterDueStatus]);

  const campaignsByStatus = useMemo(() => {
    const grouped: Record<CampaignStatus, Campaign[]> = {
      PLANEJAMENTO: [], PRONTO: [], VEICULACAO: [], TESTE: [], FINALIZADO: [],
    };
    filteredCampaigns.forEach((c) => grouped[c.status].push(c));
    // Sort by position within each column
    Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.position - b.position));
    return grouped;
  }, [filteredCampaigns]);

  const handleAddCard = (status: CampaignStatus) => {
    const title = newCardTitle.trim();
    if (!title) { setAddingInColumn(null); return; }
    const firstClient = managerClients[0];
    const maxPos = Math.max(0, ...campaignsByStatus[status].map((c) => c.position));
    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      client_id: firstClient?.id || "",
      client_name: firstClient ? (firstClient.client_label || "Cliente") : "Cliente",
      campaign_name: title, platform: "Meta Ads", objective: "Conversão",
      budget: 0, start_date: new Date().toISOString().split("T")[0],
      status, creatives: [],
      copy: { headline: "", primary_text: "", description: "", cta: "Saiba Mais" },
      checklist: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}` })),
      notes: "", created_at: new Date().toISOString(),
      labels: [], description: "", position: maxPos + 1,
    };
    createMutation.mutate(newCampaign);
    setNewCardTitle("");
  };

  const handleUpdateName = (id: string, name: string) => {
    const campaign = campaigns.find((c) => c.id === id);
    if (campaign) updateMutation.mutate({ ...campaign, campaign_name: name });
  };

  const handleCardClick = (campaign: Campaign) => { setSelectedCampaign(campaign); setDrawerOpen(true); };

  const handleSaveCampaign = (updatedCampaign: Campaign) => {
    updateMutation.mutate(updatedCampaign);
    setSelectedCampaign(null);
  };

  const handleDeleteCampaign = (id: string) => { deleteMutation.mutate(id); setSelectedCampaign(null); };

  const handleDuplicateCampaign = (campaign: Campaign) => {
    const maxPos = Math.max(0, ...campaignsByStatus[campaign.status].map((c) => c.position));
    const duplicated: Campaign = {
      ...campaign, id: crypto.randomUUID(),
      campaign_name: `${campaign.campaign_name} (Cópia)`,
      created_at: new Date().toISOString(), position: maxPos + 1,
    };
    createMutation.mutate(duplicated);
  };

  const handleMoveNext = (campaign: Campaign) => {
    const order: CampaignStatus[] = ["PLANEJAMENTO", "PRONTO", "VEICULACAO", "TESTE", "FINALIZADO"];
    const idx = order.indexOf(campaign.status);
    if (idx < order.length - 1) {
      const updated = { ...campaign, status: order[idx + 1] };
      updateMutation.mutate(updated);
      setSelectedCampaign(updated);
    }
  };

  const toggleColumn = (status: CampaignStatus) => {
    setCollapsedColumns((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  };

  // ── Local optimistic state for drag ──
  // We maintain a local copy of campaigns during dragging for real-time cross-column feedback
  const [localCampaigns, setLocalCampaigns] = useState<Campaign[] | null>(null);
  const displayCampaigns = localCampaigns ?? campaigns;

  // ── @dnd-kit handlers ──
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    // Clone current campaigns as local state so we can mutate without hitting the DB
    setLocalCampaigns([...campaigns]);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || !localCampaigns) return;

    const draggableId = active.id as string;
    const overId = over.id as string;
    const allStatuses = Object.keys(COLUMN_CONFIG) as CampaignStatus[];

    const draggedCampaign = localCampaigns.find((c) => c.id === draggableId);
    if (!draggedCampaign) return;

    // Determine target status
    let targetStatus: CampaignStatus;
    if (allStatuses.includes(overId as CampaignStatus)) {
      targetStatus = overId as CampaignStatus;
    } else {
      const overCard = localCampaigns.find((c) => c.id === overId);
      if (!overCard || overCard.status === draggedCampaign.status) return;
      targetStatus = overCard.status;
    }

    if (draggedCampaign.status === targetStatus) return;

    // Move card in local state for instant visual feedback
    setLocalCampaigns((prev) => {
      if (!prev) return prev;
      const updated = prev.filter((c) => c.id !== draggableId);
      const targetCol = updated.filter((c) => c.status === targetStatus);

      let insertIndex = targetCol.length;
      if (!allStatuses.includes(overId as CampaignStatus)) {
        const overIdx = targetCol.findIndex((c) => c.id === overId);
        if (overIdx !== -1) insertIndex = overIdx;
      }

      const allExceptTarget = updated.filter((c) => c.status !== targetStatus);
      const newTargetCol = [...targetCol];
      newTargetCol.splice(insertIndex, 0, { ...draggedCampaign, status: targetStatus });

      return [...allExceptTarget, ...newTargetCol].sort((a, b) => {
        // Preserve original inter-column ordering, just ensure moved card is in right spot
        return a.id === draggableId ? 0 : 0;
      });
    });
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setActiveId(null);
    setLocalCampaigns(null); // revert to DB state
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);

    const { active, over } = event;
    const draggableId = active.id as string;
    const overId = over?.id as string | undefined;

    // Always clear local state — we'll refetch
    setLocalCampaigns(null);

    if (!overId) return;

    const allStatuses = Object.keys(COLUMN_CONFIG) as CampaignStatus[];
    // Use original campaigns for DB logic (not local)
    const campaign = campaigns.find((c) => c.id === draggableId);
    if (!campaign) return;

    // Determine target status
    let targetStatus: CampaignStatus | null = null;
    if (allStatuses.includes(overId as CampaignStatus)) {
      targetStatus = overId as CampaignStatus;
    } else {
      const overCard = campaigns.find((c) => c.id === overId);
      if (overCard) targetStatus = overCard.status;
    }
    if (!targetStatus) return;

    const sourceColumn = [...campaignsByStatus[campaign.status]];
    const targetColumn = [...campaignsByStatus[targetStatus]];

    if (campaign.status === targetStatus) {
      // Same-column reorder
      const oldIndex = sourceColumn.findIndex((c) => c.id === draggableId);
      const newIndex = allStatuses.includes(overId as CampaignStatus)
        ? sourceColumn.length - 1
        : sourceColumn.findIndex((c) => c.id === overId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(sourceColumn, oldIndex, newIndex);
      // Batch DB updates
      Promise.all(
        reordered
          .filter((c, i) => c.position !== i)
          .map((c, _i) => {
            const newPos = reordered.indexOf(c);
            return supabase.from("strategic_campaigns").update({ position: newPos }).eq("id", c.id);
          })
      ).then(() => queryClient.invalidateQueries({ queryKey: ["execution-campaigns"] }));
    } else {
      // Cross-column move
      let insertIndex = targetColumn.length;
      if (!allStatuses.includes(overId as CampaignStatus)) {
        const overIndex = targetColumn.findIndex((c) => c.id === overId);
        if (overIndex !== -1) insertIndex = overIndex;
      }

      const newTarget = [...targetColumn];
      newTarget.splice(insertIndex, 0, campaign);
      const newSource = sourceColumn.filter((c) => c.id !== draggableId);

      // Batch all position+status updates
      const updates: Promise<unknown>[] = [];

      newTarget.forEach((c, i) => {
        if (c.id === campaign.id) {
          updates.push(
            supabase.from("strategic_campaigns")
              .update({ status: targetStatus!, position: i })
              .eq("id", c.id)
              .then()
          );
        } else {
          updates.push(
            supabase.from("strategic_campaigns").update({ position: i }).eq("id", c.id).then()
          );
        }
      });

      newSource.forEach((c, i) => {
        updates.push(
          supabase.from("strategic_campaigns").update({ position: i }).eq("id", c.id).then()
        );
      });

      Promise.all(updates).then(() =>
        queryClient.invalidateQueries({ queryKey: ["execution-campaigns"] })
      );
    }
  };

  const activeCampaign = activeId ? campaigns.find((c) => c.id === activeId) : null;

  const handleNewCardKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, status: CampaignStatus) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddCard(status); }
    if (e.key === "Escape") { setAddingInColumn(null); setNewCardTitle(""); }
  };

  const clientsList = useMemo(() => managerClients.map((c) => ({ id: c.id, name: c.client_label || "Cliente" })), [managerClients]);

  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background lg:ml-64">
        <div className="flex-shrink-0 pt-16 lg:pt-0 px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <Skeleton className="h-5 w-24 mb-2" />
        </div>
        <div className="flex-1 flex gap-0 p-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[280px] h-full flex flex-col p-3" style={{ borderRight: "1px solid var(--border)" }}>
              <Skeleton className="h-4 w-28 mb-4" />
              <Skeleton className="h-20 w-full mb-2" style={{ borderRadius: 6 }} />
              <Skeleton className="h-20 w-full" style={{ borderRadius: 6 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const statuses = Object.keys(COLUMN_CONFIG) as CampaignStatus[];

  return (
    <div className="h-screen flex flex-col bg-background lg:ml-64">
      {/* Top bar */}
      <div className="flex-shrink-0 pt-16 lg:pt-0 px-5 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between gap-3">
          <h1
            className="text-[13px] font-semibold uppercase tracking-[0.08em] shrink-0"
            style={{ fontFamily: "var(--font-sans)", color: "var(--text)" }}
          >
            Execução
          </h1>
          <div className="flex items-center gap-2 flex-1 ml-auto flex-wrap justify-end">
            {/* Search */}
            <div className="relative w-40">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="h-7 pl-7 text-xs bg-transparent border-none"
              />
            </div>
            <Select value={filterClient} onValueChange={setFilterClient}>
              <SelectTrigger className="w-auto h-7 text-xs border-none bg-transparent hover:bg-muted/50 px-2 gap-1 text-muted-foreground">
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos clientes</SelectItem>
                {clientsList.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-auto h-7 text-xs border-none bg-transparent hover:bg-muted/50 px-2 gap-1 text-muted-foreground">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas plataformas</SelectItem>
                <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                <SelectItem value="Google Ads">Google Ads</SelectItem>
                <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
                <SelectItem value="LinkedIn Ads">LinkedIn Ads</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-auto h-7 text-xs border-none bg-transparent hover:bg-muted/50 px-2 gap-1 text-muted-foreground">
                <SelectValue placeholder="Responsável" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos responsáveis</SelectItem>
                <SelectItem value="unassigned">Sem responsável</SelectItem>
                {teamProfiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.email || "Usuário"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterDueStatus} onValueChange={setFilterDueStatus}>
              <SelectTrigger className="w-auto h-7 text-xs border-none bg-transparent hover:bg-muted/50 px-2 gap-1 text-muted-foreground">
                <SelectValue placeholder="Prazo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos prazos</SelectItem>
                <SelectItem value="overdue">🔴 Atrasado</SelectItem>
                <SelectItem value="today">🟡 Vence hoje</SelectItem>
                <SelectItem value="on_time">🟢 No prazo</SelectItem>
                <SelectItem value="no_date">Sem prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full">
            {statuses.map((status, colIndex) => {
              const columnCampaigns = campaignsByStatus[status];
              const isLast = colIndex === statuses.length - 1;
              const columnIds = columnCampaigns.map((c) => c.id);
              const isCollapsed = collapsedColumns.has(status);
              const doneCount = columnCampaigns.filter((c) => {
                const total = c.checklist?.length ?? 0;
                const checked = c.checklist?.filter((i) => i.checked).length ?? 0;
                return total > 0 && checked === total;
              }).length;

              return (
                <div
                  key={status}
                  className="kanban-col flex-shrink-0 flex flex-col h-full"
                  style={{
                    minWidth: isCollapsed ? 48 : 280, width: isCollapsed ? 48 : 280,
                    borderRight: isLast ? "none" : "1px solid var(--border)",
                    background: "transparent", transition: "width 0.2s ease, min-width 0.2s ease",
                  }}
                >
                  <KanbanColumnHeader
                    status={status} count={columnCampaigns.length}
                    doneCount={doneCount} collapsed={isCollapsed}
                    onToggleCollapse={() => toggleColumn(status)}
                  />

                  {!isCollapsed && (
                    <>
                      <SortableContext items={columnIds} strategy={verticalListSortingStrategy} id={status}>
                        <DroppableColumn status={status} isOver={!!activeId}>
                          {columnCampaigns.map((campaign) => (
                            <SortableCard
                              key={campaign.id} campaign={campaign}
                              onClick={() => handleCardClick(campaign)}
                              onUpdateName={handleUpdateName}
                              assigneeName={campaign.assigned_to ? profileMap.get(campaign.assigned_to) : null}
                              commentCount={commentCounts[campaign.id] || 0}
                            />
                          ))}
                          {addingInColumn === status && (
                            <div className="px-3 py-2.5" style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 6 }}>
                              <textarea
                                ref={newCardRef} value={newCardTitle}
                                onChange={(e) => setNewCardTitle(e.target.value)}
                                onKeyDown={(e) => handleNewCardKeyDown(e, status)}
                                placeholder="Insira um título para este cartão..."
                                className="w-full text-[13px] bg-transparent border-none outline-none resize-none leading-snug p-0"
                                style={{ color: "var(--text)", fontFamily: "var(--font-sans)" }}
                                rows={2}
                              />
                              <div className="flex items-center gap-1.5 mt-2">
                                <button
                                  className="h-7 text-xs px-3 font-medium"
                                  style={{ background: "var(--accent)", color: "#fff", fontFamily: "var(--font-sans)", borderRadius: 4 }}
                                  onClick={() => handleAddCard(status)}
                                  disabled={createMutation.isPending}
                                >
                                  {createMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin inline" />}
                                  Adicionar
                                </button>
                                <button onClick={() => { setAddingInColumn(null); setNewCardTitle(""); }} className="p-1" style={{ color: "var(--muted)" }}>
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </DroppableColumn>
                      </SortableContext>

                      {addingInColumn !== status && (
                        <button
                          onClick={() => { setAddingInColumn(status); setNewCardTitle(""); }}
                          className="flex-shrink-0 flex items-center justify-center gap-1.5 w-[calc(100%-24px)] mx-3 mb-3 px-3 py-2.5 text-[12px] font-medium"
                          style={{
                            fontFamily: "var(--font-sans)", color: "var(--muted)",
                            background: "transparent", border: "1px dashed var(--border2)",
                            borderRadius: 6, transition: "border-color 0.15s ease, color 0.15s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--muted)"; }}
                        >
                          <Plus className="h-4 w-4" /> Adicionar tarefa
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeCampaign ? (
            <div style={{
              boxShadow: "0 12px 40px rgba(0,0,0,0.45), 0 4px 12px rgba(0,0,0,0.2)",
              transform: "rotate(2deg) scale(1.03)",
              cursor: "grabbing",
              borderRadius: 8,
              opacity: 0.95,
            }}>
              <CampaignCard campaign={activeCampaign} onClick={() => {}} onUpdateName={() => {}} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <CampaignDrawer
        campaign={selectedCampaign} open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedCampaign(null); }}
        onSave={handleSaveCampaign} onDelete={handleDeleteCampaign}
        onDuplicate={handleDuplicateCampaign} onMoveNext={handleMoveNext}
        clients={clientsList} teamProfiles={teamProfiles}
      />
    </div>
  );
}
