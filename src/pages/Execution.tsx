import { useState, useMemo, useRef, useEffect, KeyboardEvent } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Loader2 } from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import { CampaignDrawer } from "@/components/CampaignDrawer";
import type { Campaign, CampaignStatus, Platform } from "@/lib/execution-types";
import { COLUMN_CONFIG, DEFAULT_CHECKLIST } from "@/lib/execution-types";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useManagerClients } from "@/hooks/useManagerClients";
import { Skeleton } from "@/components/ui/skeleton";

// ── Supabase → Campaign mapper ──
function mapDbToCampaign(row: Record<string, unknown>, clientName: string): Campaign {
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
        creatives: Array.isArray(row.creatives) ? row.creatives as Campaign["creatives"] : [],
        copy: (row.copy as Campaign["copy"]) || { headline: "", primary_text: "", description: "", cta: "Saiba Mais" },
        checklist: Array.isArray(row.checklist) ? row.checklist as Campaign["checklist"] : DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}` })),
        notes: (row.notes as string) || "",
        created_at: row.created_at as string,
        labels: [],
        description: (row.learning as string) || "",
        cover_url: undefined,
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
        creatives: c.creatives,
        copy: c.copy,
        checklist: c.checklist,
        notes: c.notes,
        learning: c.description,
    };
}

// ── Sortable Card Wrapper ──
function SortableCard({
    campaign,
    onClick,
    onUpdateName,
}: {
    campaign: Campaign;
    onClick: () => void;
    onUpdateName: (id: string, name: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: campaign.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <CampaignCard
                campaign={campaign}
                onClick={onClick}
                onUpdateName={onUpdateName}
                isDragging={isDragging}
            />
        </div>
    );
}

export default function Execution() {
    const queryClient = useQueryClient();
    const { clients: managerClients } = useManagerClients();
    const clientMap = useMemo(() => new Map(managerClients.map((c) => [c.id, c.client_label || "Cliente"])), [managerClients]);

    // Fetch campaigns from Supabase
    const { data: campaigns = [], isLoading } = useQuery({
        queryKey: ["execution-campaigns"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("strategic_campaigns")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []).map((row) => mapDbToCampaign(row, clientMap.get(row.client_id) || "Cliente"));
        },
        enabled: managerClients.length > 0,
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ["execution-campaigns"] });

    // Mutations
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

    useEffect(() => {
        if (addingInColumn && newCardRef.current) {
            newCardRef.current.focus();
        }
    }, [addingInColumn]);

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter((c) => {
            if (filterClient !== "all" && c.client_id !== filterClient) return false;
            if (filterPlatform !== "all" && c.platform !== filterPlatform) return false;
            return true;
        });
    }, [campaigns, filterClient, filterPlatform]);

    const campaignsByStatus = useMemo(() => {
        const grouped: Record<CampaignStatus, Campaign[]> = {
            PLANEJAMENTO: [], PRONTO: [], VEICULACAO: [], TESTE: [], FINALIZADO: [],
        };
        filteredCampaigns.forEach((c) => grouped[c.status].push(c));
        return grouped;
    }, [filteredCampaigns]);

    const handleAddCard = (status: CampaignStatus) => {
        const title = newCardTitle.trim();
        if (!title) { setAddingInColumn(null); return; }
        const firstClient = managerClients[0];
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
            labels: [], description: "",
        };
        createMutation.mutate(newCampaign);
        setNewCardTitle("");
    };

    const handleUpdateName = (id: string, name: string) => {
        const campaign = campaigns.find((c) => c.id === id);
        if (campaign) updateMutation.mutate({ ...campaign, campaign_name: name });
    };

    const handleCardClick = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setDrawerOpen(true);
    };

    const handleSaveCampaign = (updatedCampaign: Campaign) => {
        updateMutation.mutate(updatedCampaign);
        setSelectedCampaign(null);
    };

    const handleDeleteCampaign = (id: string) => {
        deleteMutation.mutate(id);
        setSelectedCampaign(null);
    };

    const handleDuplicateCampaign = (campaign: Campaign) => {
        const duplicated: Campaign = {
            ...campaign, id: crypto.randomUUID(),
            campaign_name: `${campaign.campaign_name} (Cópia)`,
            created_at: new Date().toISOString(),
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

    // ── @dnd-kit handlers ──
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const draggableId = active.id as string;
        const overId = over.id as string;

        // Determine which column was dropped into
        const allStatuses = Object.keys(COLUMN_CONFIG) as CampaignStatus[];
        let targetStatus: CampaignStatus | null = null;

        // If dropped onto a column ID
        if (allStatuses.includes(overId as CampaignStatus)) {
            targetStatus = overId as CampaignStatus;
        } else {
            // Dropped onto another card — find that card's column
            const overCard = campaigns.find((c) => c.id === overId);
            if (overCard) targetStatus = overCard.status;
        }

        if (!targetStatus) return;

        const campaign = campaigns.find((c) => c.id === draggableId);
        if (campaign && campaign.status !== targetStatus) {
            updateMutation.mutate({ ...campaign, status: targetStatus });
        }
    };

    const activeCampaign = activeId ? campaigns.find((c) => c.id === activeId) : null;

    const handleNewCardKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, status: CampaignStatus) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleAddCard(status);
        }
        if (e.key === "Escape") {
            setAddingInColumn(null);
            setNewCardTitle("");
        }
    };

    // Build clients list for drawer and filters from real data
    const clientsList = useMemo(() => managerClients.map((c) => ({ id: c.id, name: c.client_label || "Cliente" })), [managerClients]);

    if (isLoading) {
        return (
            <div className="h-screen flex flex-col bg-background lg:ml-64">
                <div className="flex-shrink-0 pt-16 lg:pt-0 px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                    <Skeleton className="h-5 w-24 mb-2" />
                </div>
                <div className="flex-1 flex gap-0 p-2 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[280px] h-full flex flex-col p-3" style={{ borderRight: '1px solid var(--border)' }}>
                            <Skeleton className="h-4 w-28 mb-4" style={{ borderRadius: 0 }} />
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
            <div className="flex-shrink-0 pt-16 lg:pt-0 px-5 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                    <h1
                        className="text-[13px] font-semibold uppercase tracking-[0.08em]"
                        style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}
                    >
                        Execução
                    </h1>
                    <div className="flex items-center gap-2">
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
                    </div>
                </div>
            </div>

            {/* Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="flex h-full">
                        {statuses.map((status, colIndex) => {
                            const config = COLUMN_CONFIG[status];
                            const columnCampaigns = campaignsByStatus[status];
                            const isLast = colIndex === statuses.length - 1;
                            const columnIds = columnCampaigns.map((c) => c.id);

                            return (
                                <div
                                    key={status}
                                    className="kanban-col flex-shrink-0 flex flex-col h-full group/col"
                                    style={{
                                        minWidth: 280,
                                        width: 280,
                                        borderRight: isLast ? 'none' : '1px solid var(--border)',
                                        background: 'transparent',
                                    }}
                                >
                                    {/* Column Header */}
                                    <div
                                        className="flex-shrink-0 px-4 pt-3 pb-2 flex items-center gap-2 relative"
                                        style={{ borderBottom: '1px solid var(--border)' }}
                                    >
                                        {/* Hover accent line */}
                                        <div
                                            className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover/col:opacity-100"
                                            style={{ background: '#FF5C3A', transition: 'opacity 0.15s ease' }}
                                        />
                                        <span
                                            className="text-[11px] font-bold uppercase tracking-[0.08em]"
                                            style={{ fontFamily: 'Syne, sans-serif', color: 'var(--muted)' }}
                                        >
                                            {config.label}
                                        </span>
                                        <span
                                            className="text-[10px] px-1.5 py-[1px]"
                                            style={{
                                                fontFamily: 'DM Mono, monospace',
                                                background: 'var(--surface2)',
                                                border: '1px solid var(--border2)',
                                                color: 'var(--muted)',
                                                borderRadius: 4,
                                            }}
                                        >
                                            {columnCampaigns.length}
                                        </span>
                                    </div>

                                    {/* Cards area */}
                                    <SortableContext items={columnIds} strategy={verticalListSortingStrategy} id={status}>
                                        <div
                                            className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-[40px]"
                                            data-column-id={status}
                                            style={{
                                                transition: 'background 0.15s ease',
                                                background: activeId ? 'rgba(255,92,58,0.03)' : 'transparent',
                                            }}
                                        >
                                            {columnCampaigns.map((campaign) => (
                                                <SortableCard
                                                    key={campaign.id}
                                                    campaign={campaign}
                                                    onClick={() => handleCardClick(campaign)}
                                                    onUpdateName={handleUpdateName}
                                                />
                                            ))}

                                            {/* Inline new card input */}
                                            {addingInColumn === status && (
                                                <div
                                                    className="px-3 py-2.5"
                                                    style={{
                                                        background: 'var(--surface)',
                                                        border: '1px solid var(--border2)',
                                                        borderRadius: 6,
                                                    }}
                                                >
                                                    <textarea
                                                        ref={newCardRef}
                                                        value={newCardTitle}
                                                        onChange={(e) => setNewCardTitle(e.target.value)}
                                                        onKeyDown={(e) => handleNewCardKeyDown(e, status)}
                                                        placeholder="Insira um título para este cartão..."
                                                        className="w-full text-[13px] bg-transparent border-none outline-none resize-none leading-snug p-0"
                                                        style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif' }}
                                                        rows={2}
                                                    />
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                        <button
                                                            className="h-7 text-xs px-3 font-medium"
                                                            style={{
                                                                background: 'var(--accent)',
                                                                color: 'var(--bg)',
                                                                fontFamily: 'Syne, sans-serif',
                                                                borderRadius: 4,
                                                            }}
                                                            onClick={() => handleAddCard(status)}
                                                            disabled={createMutation.isPending}
                                                        >
                                                            {createMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin inline" />}
                                                            Adicionar
                                                        </button>
                                                        <button
                                                            onClick={() => { setAddingInColumn(null); setNewCardTitle(""); }}
                                                            className="p-1"
                                                            style={{ color: 'var(--muted)' }}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </SortableContext>

                                    {/* "+ Adicionar tarefa" footer */}
                                    {addingInColumn !== status && (
                                        <button
                                            onClick={() => { setAddingInColumn(status); setNewCardTitle(""); }}
                                            className="exec-add-btn flex-shrink-0 flex items-center justify-center gap-1.5 w-[calc(100%-24px)] mx-3 mb-3 px-3 py-2.5 text-[12px] font-medium"
                                            style={{
                                                fontFamily: 'Syne, sans-serif',
                                                color: 'var(--muted)',
                                                background: 'transparent',
                                                border: '1px dashed var(--border2)',
                                                borderRadius: 6,
                                                transition: 'border-color 0.15s ease, color 0.15s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#FF5C3A';
                                                e.currentTarget.style.color = '#FF5C3A';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--border2)';
                                                e.currentTarget.style.color = 'var(--muted)';
                                            }}
                                        >
                                            <Plus className="h-4 w-4" />
                                            + Adicionar tarefa
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeCampaign ? (
                        <div style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)', transform: 'scale(1.02)' }}>
                            <CampaignCard
                                campaign={activeCampaign}
                                onClick={() => { }}
                                onUpdateName={() => { }}
                                isDragging
                            />
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            <CampaignDrawer
                campaign={selectedCampaign}
                open={drawerOpen}
                onClose={() => { setDrawerOpen(false); setSelectedCampaign(null); }}
                onSave={handleSaveCampaign}
                onDelete={handleDeleteCampaign}
                onDuplicate={handleDuplicateCampaign}
                onMoveNext={handleMoveNext}
                clients={clientsList}
            />
        </div>
    );
}
