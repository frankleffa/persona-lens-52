import { useState, useMemo, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, MoreHorizontal, Loader2 } from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import { CampaignDrawer } from "@/components/CampaignDrawer";
import type { Campaign, CampaignStatus, Platform } from "@/lib/execution-types";
import { COLUMN_CONFIG, DEFAULT_CHECKLIST } from "@/lib/execution-types";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
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

    const handleDragEnd = (result: DropResult) => {
        const { destination, draggableId } = result;
        if (!destination) return;
        const newStatus = destination.droppableId as CampaignStatus;
        const campaign = campaigns.find((c) => c.id === draggableId);
        if (campaign && campaign.status !== newStatus) {
            updateMutation.mutate({ ...campaign, status: newStatus });
        }
    };

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
                <div className="flex-shrink-0 pt-16 lg:pt-0 px-4 py-3 border-b border-border/60">
                    <Skeleton className="h-5 w-24 mb-2" />
                </div>
                <div className="flex-1 flex gap-2 p-2 overflow-hidden">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-[272px] h-full flex flex-col bg-secondary/40 rounded-xl p-2">
                            <Skeleton className="h-5 w-28 mb-3" />
                            <Skeleton className="h-24 w-full mb-2 rounded-lg" />
                            <Skeleton className="h-24 w-full rounded-lg" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-background lg:ml-64">
            {/* Top bar */}
            <div className="flex-shrink-0 pt-16 lg:pt-0 px-4 py-3 border-b border-border/60">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-sm font-medium text-foreground">Execução</h1>
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
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-2">
                    <div className="flex h-full gap-2">
                        {(Object.keys(COLUMN_CONFIG) as CampaignStatus[]).map((status) => {
                            const config = COLUMN_CONFIG[status];
                            const columnCampaigns = campaignsByStatus[status];

                            return (
                                <div key={status} className="kanban-col flex-shrink-0 w-[272px] h-full flex flex-col bg-transparent">
                                    {/* Column Header — Trello style */}
                                    <div className="flex-shrink-0 px-2 pt-2 pb-1 flex items-center justify-between">
                                        <h3 className="kanban-header px-1">{config.label}</h3>
                                        <button className="p-1 rounded hover:bg-muted/60 text-muted-foreground">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </button>
                                    </div>

                                    {/* Cards */}
                                    <Droppable droppableId={status}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`flex-1 overflow-y-auto px-1 pb-1 space-y-1 min-h-[2px] transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                                            >
                                                {columnCampaigns.map((campaign, index) => (
                                                    <Draggable key={campaign.id} draggableId={campaign.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={snapshot.isDragging ? "opacity-70 rotate-[2deg]" : ""}
                                                            >
                                                                <CampaignCard
                                                                    campaign={campaign}
                                                                    onClick={() => handleCardClick(campaign)}
                                                                    onUpdateName={handleUpdateName}
                                                                />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}

                                                {/* Inline new card input */}
                                                {addingInColumn === status && (
                                                    <div className="rounded-lg bg-card px-2.5 py-2 shadow-sm">
                                                        <textarea
                                                            ref={newCardRef}
                                                            value={newCardTitle}
                                                            onChange={(e) => setNewCardTitle(e.target.value)}
                                                            onKeyDown={(e) => handleNewCardKeyDown(e, status)}
                                                            placeholder="Insira um título para este cartão..."
                                                            className="w-full text-sm text-foreground bg-transparent border-none outline-none resize-none leading-snug p-0 placeholder:text-muted-foreground/50"
                                                            rows={2}
                                                        />
                                                        <div className="flex items-center gap-1 mt-2">
                                                            <Button
                                                                size="sm"
                                                                className="h-7 text-xs px-3"
                                                                onClick={() => handleAddCard(status)}
                                                                disabled={createMutation.isPending}
                                                            >
                                                                {createMutation.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                                                Adicionar cartão
                                                            </Button>
                                                            <button
                                                                onClick={() => { setAddingInColumn(null); setNewCardTitle(""); }}
                                                                className="p-1 rounded hover:bg-muted/60 text-muted-foreground"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>

                                    {/* "+ Adicionar um cartão" footer */}
                                    {addingInColumn !== status && (
                                        <button
                                            onClick={() => { setAddingInColumn(status); setNewCardTitle(""); }}
                                            className="flex-shrink-0 flex items-center gap-1.5 w-full px-3 py-2 text-sm text-muted-foreground hover:bg-muted/40 rounded-b-xl transition-colors"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Adicionar um cartão
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DragDropContext>

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
