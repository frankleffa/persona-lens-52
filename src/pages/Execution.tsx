import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import { CampaignDrawer } from "@/components/CampaignDrawer";
import type { Campaign, CampaignStatus, Platform } from "@/lib/execution-types";
import { COLUMN_CONFIG, DEFAULT_CHECKLIST } from "@/lib/execution-types";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

// Mock clients - substituir por dados reais do Supabase
const MOCK_CLIENTS = [
    { id: "1", name: "TechBrasil" },
    { id: "2", name: "Loja Virtual" },
    { id: "3", name: "Consultoria XYZ" },
];

// Mock campaigns - substituir por dados do Supabase
const MOCK_CAMPAIGNS: Campaign[] = [
    {
        id: "1",
        client_id: "1",
        client_name: "TechBrasil",
        campaign_name: "Black Friday 2024 - Conversão",
        platform: "Meta Ads",
        objective: "Conversão",
        budget: 5000,
        start_date: "2024-11-20",
        status: "PLANEJAMENTO",
        creatives: [
            { id: "c1", name: "Banner Principal", type: "link", url: "https://drive.google.com/..." },
        ],
        copy: {
            headline: "Até 70% OFF na Black Friday",
            primary_text: "Não perca as melhores ofertas do ano!",
            description: "Válido até 30/11",
            cta: "Comprar Agora",
        },
        checklist: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}`, checked: false })),
        notes: "Aguardando aprovação do cliente",
        created_at: new Date().toISOString(),
    },
    {
        id: "2",
        client_id: "2",
        client_name: "Loja Virtual",
        campaign_name: "Lançamento Produto X",
        platform: "Google Ads",
        objective: "Tráfego",
        budget: 3000,
        start_date: "2024-11-25",
        status: "PRONTO",
        creatives: [],
        copy: {
            headline: "Conheça o Produto X",
            primary_text: "Inovação que você precisa",
            description: "Lançamento exclusivo",
            cta: "Saiba Mais",
        },
        checklist: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}`, checked: i < 3 })),
        notes: "",
        created_at: new Date().toISOString(),
    },
];

export default function Execution() {
    const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS);
    const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Filtros
    const [filterClient, setFilterClient] = useState<string>("all");
    const [filterPlatform, setFilterPlatform] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const filteredCampaigns = useMemo(() => {
        return campaigns.filter((campaign) => {
            if (filterClient !== "all" && campaign.client_id !== filterClient) return false;
            if (filterPlatform !== "all" && campaign.platform !== filterPlatform) return false;
            if (filterStatus !== "all" && campaign.status !== filterStatus) return false;
            return true;
        });
    }, [campaigns, filterClient, filterPlatform, filterStatus]);

    const campaignsByStatus = useMemo(() => {
        const grouped: Record<CampaignStatus, Campaign[]> = {
            PLANEJAMENTO: [],
            PRONTO: [],
            VEICULACAO: [],
            TESTE: [],
            FINALIZADO: [],
        };

        filteredCampaigns.forEach((campaign) => {
            grouped[campaign.status].push(campaign);
        });

        return grouped;
    }, [filteredCampaigns]);

    const handleCreateCampaign = () => {
        const newCampaign: Campaign = {
            id: Date.now().toString(),
            client_id: MOCK_CLIENTS[0].id,
            client_name: MOCK_CLIENTS[0].name,
            campaign_name: "Nova Campanha",
            platform: "Meta Ads",
            objective: "Conversão",
            budget: 0,
            start_date: new Date().toISOString().split("T")[0],
            status: "PLANEJAMENTO",
            creatives: [],
            copy: {
                headline: "",
                primary_text: "",
                description: "",
                cta: "Saiba Mais",
            },
            checklist: DEFAULT_CHECKLIST.map((item, i) => ({ ...item, id: `ch${i}` })),
            notes: "",
            created_at: new Date().toISOString(),
        };

        setCampaigns([...campaigns, newCampaign]);
        setSelectedCampaign(newCampaign);
        setDrawerOpen(true);
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
            ...campaign,
            id: Date.now().toString(),
            campaign_name: `${campaign.campaign_name} (Cópia)`,
            created_at: new Date().toISOString(),
        };
        setCampaigns([...campaigns, duplicated]);
    };

    const handleMoveNext = (campaign: Campaign) => {
        const statusOrder: CampaignStatus[] = ["PLANEJAMENTO", "PRONTO", "VEICULACAO", "TESTE", "FINALIZADO"];
        const currentIndex = statusOrder.indexOf(campaign.status);
        if (currentIndex < statusOrder.length - 1) {
            const nextStatus = statusOrder[currentIndex + 1];
            const updated = { ...campaign, status: nextStatus };
            setCampaigns(campaigns.map((c) => (c.id === campaign.id ? updated : c)));
            setSelectedCampaign(updated);
        }
    };

    const handleDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const newStatus = destination.droppableId as CampaignStatus;
        setCampaigns(
            campaigns.map((c) => (c.id === draggableId ? { ...c, status: newStatus } : c))
        );
    };

    return (
        <div className="h-screen flex flex-col bg-background lg:ml-64">
            {/* Top bar — compact like Notion */}
            <div className="flex-shrink-0 pt-16 lg:pt-0 px-4 py-3 border-b border-border/60">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-sm font-medium text-foreground">Execução</h1>
                    <Button onClick={handleCreateCampaign} variant="ghost" size="sm" className="gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground">
                        <Plus className="h-3.5 w-3.5" />
                        Novo
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={filterClient} onValueChange={setFilterClient}>
                        <SelectTrigger className="w-auto h-7 text-xs border-none bg-transparent hover:bg-muted/50 px-2 gap-1 text-muted-foreground">
                            <SelectValue placeholder="Cliente" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos clientes</SelectItem>
                            {MOCK_CLIENTS.map((client) => (
                                <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                            ))}
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

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-auto h-7 text-xs border-none bg-transparent hover:bg-muted/50 px-2 gap-1 text-muted-foreground">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos status</SelectItem>
                            {Object.entries(COLUMN_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.icon} {config.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Board — full remaining height, horizontal scroll */}
            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="flex-1 overflow-x-auto overflow-y-hidden">
                    <div className="flex h-full gap-0">
                        {(Object.keys(COLUMN_CONFIG) as CampaignStatus[]).map((status) => {
                            const config = COLUMN_CONFIG[status];
                            const columnCampaigns = campaignsByStatus[status];

                            return (
                                <div key={status} className="flex-shrink-0 w-[280px] h-full flex flex-col border-r border-border/40 last:border-r-0">
                                    {/* Column Header */}
                                    <div className="flex-shrink-0 px-3 py-2.5 flex items-center gap-2">
                                        <span className="text-xs">{config.icon}</span>
                                        <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{config.label}</h3>
                                        <span className="text-[10px] text-muted-foreground/60 ml-auto">{columnCampaigns.length}</span>
                                    </div>

                                    {/* Droppable Column — scrollable */}
                                    <Droppable droppableId={status}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className={`flex-1 overflow-y-auto px-1.5 pb-3 space-y-1.5 transition-colors ${snapshot.isDraggingOver ? "bg-primary/5" : ""}`}
                                            >
                                                {columnCampaigns.map((campaign, index) => (
                                                    <Draggable key={campaign.id} draggableId={campaign.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={snapshot.isDragging ? "opacity-60 rotate-1" : ""}
                                                            >
                                                                <CampaignCard campaign={campaign} onClick={() => handleCardClick(campaign)} />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </DragDropContext>

            {/* Campaign Drawer */}
            <CampaignDrawer
                campaign={selectedCampaign}
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedCampaign(null);
                }}
                onSave={handleSaveCampaign}
                onDelete={handleDeleteCampaign}
                onDuplicate={handleDuplicateCampaign}
                onMoveNext={handleMoveNext}
                clients={MOCK_CLIENTS}
            />
        </div>
    );
}
