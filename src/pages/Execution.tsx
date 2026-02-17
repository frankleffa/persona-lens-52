import { useState, useMemo, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, MoreHorizontal } from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import { CampaignDrawer } from "@/components/CampaignDrawer";
import type { Campaign, CampaignStatus, Platform } from "@/lib/execution-types";
import { COLUMN_CONFIG, DEFAULT_CHECKLIST } from "@/lib/execution-types";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

const MOCK_CLIENTS = [
    { id: "1", name: "TechBrasil" },
    { id: "2", name: "Loja Virtual" },
    { id: "3", name: "Consultoria XYZ" },
];

const MOCK_CAMPAIGNS: Campaign[] = [
    {
        id: "1", client_id: "1", client_name: "TechBrasil",
        campaign_name: "Black Friday 2024 - Conversão",
        platform: "Meta Ads", objective: "Conversão", budget: 5000,
        start_date: "2024-11-20", status: "PLANEJAMENTO",
        creatives: [{ id: "c1", name: "Banner Principal", type: "link", url: "https://drive.google.com/..." }],
        copy: { headline: "Até 70% OFF na Black Friday", primary_text: "Não perca!", description: "Válido até 30/11", cta: "Comprar Agora" },
        checklist: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}`, checked: false })),
        notes: "Aguardando aprovação do cliente", created_at: new Date().toISOString(),
        labels: [
            { id: "l1", text: "Urgente", color: "#eb5a46" },
            { id: "l2", text: "Black Friday", color: "#61bd4f" },
        ],
        description: "Campanha principal de conversão para a Black Friday 2024. Foco em retargeting.",
        cover_url: "https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=600&h=300&fit=crop",
    },
    {
        id: "2", client_id: "2", client_name: "Loja Virtual",
        campaign_name: "Lançamento Produto X",
        platform: "Google Ads", objective: "Tráfego", budget: 3000,
        start_date: "2024-11-25", status: "PRONTO",
        creatives: [],
        copy: { headline: "Conheça o Produto X", primary_text: "Inovação", description: "Lançamento exclusivo", cta: "Saiba Mais" },
        checklist: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}`, checked: i < 3 })),
        notes: "", created_at: new Date().toISOString(),
        labels: [{ id: "l3", text: "Lançamento", color: "#0079bf" }],
        description: "",
    },
];

export default function Execution() {
    const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [addingInColumn, setAddingInColumn] = useState<CampaignStatus | null>(null);
    const [newCardTitle, setNewCardTitle] = useState("");
    const newCardRef = useRef<HTMLTextAreaElement>(null);

    const [filterClient, setFilterClient] = useState<string>("all");
    const [filterPlatform, setFilterPlatform] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    useEffect(() => {
        if (addingInColumn && newCardRef.current) {
            newCardRef.current.focus();
        }
    }, [addingInColumn]);

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter((c) => {
            if (filterClient !== "all" && c.client_id !== filterClient) return false;
            if (filterPlatform !== "all" && c.platform !== filterPlatform) return false;
            if (filterStatus !== "all" && c.status !== filterStatus) return false;
            return true;
        });
    }, [campaigns, filterClient, filterPlatform, filterStatus]);

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
        const newCampaign: Campaign = {
            id: Date.now().toString(),
            client_id: MOCK_CLIENTS[0].id, client_name: MOCK_CLIENTS[0].name,
            campaign_name: title, platform: "Meta Ads", objective: "Conversão",
            budget: 0, start_date: new Date().toISOString().split("T")[0],
            status, creatives: [],
            copy: { headline: "", primary_text: "", description: "", cta: "Saiba Mais" },
            checklist: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}` })),
            notes: "", created_at: new Date().toISOString(),
            labels: [], description: "",
        };
        setCampaigns([...campaigns, newCampaign]);
        setNewCardTitle("");
        // Keep adding mode open for rapid entry
    };

    const handleUpdateName = (id: string, name: string) => {
        setCampaigns(campaigns.map((c) => (c.id === id ? { ...c, campaign_name: name } : c)));
    };

    const handleCardClick = (campaign: Campaign) => {
        setSelectedCampaign(campaign);
        setDrawerOpen(true);
    };

    const handleSaveCampaign = (updatedCampaign: Campaign) => {
        setCampaigns(campaigns.map((c) => (c.id === updatedCampaign.id ? updatedCampaign : c)));
        setSelectedCampaign(null);
    };

    const handleDeleteCampaign = (id: string) => {
        setCampaigns(campaigns.filter((c) => c.id !== id));
        setSelectedCampaign(null);
    };

    const handleDuplicateCampaign = (campaign: Campaign) => {
        const duplicated: Campaign = {
            ...campaign, id: Date.now().toString(),
            campaign_name: `${campaign.campaign_name} (Cópia)`,
            created_at: new Date().toISOString(),
        };
        setCampaigns([...campaigns, duplicated]);
    };

    const handleMoveNext = (campaign: Campaign) => {
        const order: CampaignStatus[] = ["PLANEJAMENTO", "PRONTO", "VEICULACAO", "TESTE", "FINALIZADO"];
        const idx = order.indexOf(campaign.status);
        if (idx < order.length - 1) {
            const updated = { ...campaign, status: order[idx + 1] };
            setCampaigns(campaigns.map((c) => (c.id === campaign.id ? updated : c)));
            setSelectedCampaign(updated);
        }
    };

    const handleDragEnd = (result: DropResult) => {
        const { destination, draggableId } = result;
        if (!destination) return;
        const newStatus = destination.droppableId as CampaignStatus;
        setCampaigns(campaigns.map((c) => (c.id === draggableId ? { ...c, status: newStatus } : c)));
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
                                {MOCK_CLIENTS.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
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
                                <div key={status} className="flex-shrink-0 w-[272px] h-full flex flex-col bg-secondary/40 rounded-xl">
                                    {/* Column Header — Trello style */}
                                    <div className="flex-shrink-0 px-2 pt-2 pb-1 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-foreground px-1">{config.label}</h3>
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
                                                            >
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
                clients={MOCK_CLIENTS}
            />
        </div>
    );
}
