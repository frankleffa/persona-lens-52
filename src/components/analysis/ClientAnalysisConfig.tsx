import { useState, useEffect } from "react";
import { Save, BrainCircuit, HelpCircle, Search, Loader2, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useClientAnalysisConfig, useMetaEventDiscovery, type MetaEvent } from "@/hooks/useClientAnalysisConfig";

function EventDiscoveryModal({
    open,
    onOpenChange,
    events,
    isLoading,
    onSelect,
    currentValue,
    warnings,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    events: MetaEvent[];
    isLoading: boolean;
    onSelect: (actionType: string) => void;
    currentValue: string;
    warnings: string[];
}) {
    const [filter, setFilter] = useState("");
    const [showOnlyCustom, setShowOnlyCustom] = useState(true);

    const filtered = events.filter((e) => {
        if (showOnlyCustom && !e.is_custom && !e.is_conversion) return false;
        if (filter && !e.action_type.toLowerCase().includes(filter.toLowerCase())) return false;
        return true;
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-base">Eventos Meta Ads (últimos 30 dias)</DialogTitle>
                </DialogHeader>

                <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Filtrar eventos..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="h-8 text-sm"
                        />
                        <Button
                            variant={showOnlyCustom ? "default" : "outline"}
                            size="sm"
                            onClick={() => setShowOnlyCustom(!showOnlyCustom)}
                            className="whitespace-nowrap text-xs"
                        >
                            {showOnlyCustom ? "Custom/Conv" : "Todos"}
                        </Button>
                    </div>

                    {warnings.length > 0 && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-2 space-y-1">
                            <p className="text-[10px] font-semibold text-yellow-400">Avisos da API:</p>
                            {warnings.map((w, i) => (
                                <p key={i} className="text-[10px] text-yellow-300/80 font-mono break-all">{w}</p>
                            ))}
                        </div>
                    )}

                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-sm text-muted-foreground">Buscando eventos...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            {events.length === 0 ? "Nenhum evento encontrado." : "Nenhum evento corresponde ao filtro."}
                        </p>
                    ) : (
                        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
                            {filtered.map((event) => (
                                <button
                                    key={event.action_type}
                                    onClick={() => {
                                        onSelect(event.action_type);
                                        onOpenChange(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-accent/50 transition-colors flex items-center gap-2 text-sm group"
                                >
                                    <div className="flex-1 min-w-0">
                                        {event.name ? (
                                            <>
                                                <span className="font-medium text-foreground">{event.name}</span>
                                                <code className="text-[10px] block text-muted-foreground font-mono truncate">
                                                    {event.action_type}
                                                </code>
                                            </>
                                        ) : (
                                            <code className="text-xs break-all font-mono text-foreground/80">
                                                {event.action_type}
                                            </code>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        {event.is_custom && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">custom</Badge>
                                        )}
                                        {event.is_conversion && (
                                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">conv</Badge>
                                        )}
                                        {currentValue === event.action_type && (
                                            <Check className="h-3.5 w-3.5 text-primary" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function ClientAnalysisConfig({ clientId }: { clientId: string }) {
    const { config, isLoading, saveConfig } = useClientAnalysisConfig(clientId);
    const { fetchAvailableEvents, isLoadingEvents, availableEvents, warnings } = useMetaEventDiscovery(clientId);
    const [formData, setFormData] = useState({
        vertical: "ecommerce",
        primary_metric: "purchases",
        primary_metric_label: "Compras",
        cpa_target: "",
        roas_target: "",
        cost_per_ftd_target: "",
        ftd_event_name: "",
        ftd_google_conversion_name: "",
        registration_event_name: "",
    });
    const [saving, setSaving] = useState(false);
    const [eventsModalOpen, setEventsModalOpen] = useState(false);
    const [regEventsModalOpen, setRegEventsModalOpen] = useState(false);

    useEffect(() => {
        if (config) {
            setFormData({
                vertical: config.vertical || "ecommerce",
                primary_metric: config.primary_metric || "purchases",
                primary_metric_label: config.primary_metric_label || "Compras",
                cpa_target: config.cpa_target?.toString() || "",
                roas_target: config.roas_target?.toString() || "",
                cost_per_ftd_target: config.cost_per_ftd_target?.toString() || "",
                ftd_event_name: (config as any).ftd_event_name || "",
                ftd_google_conversion_name: (config as any).ftd_google_conversion_name || "",
                registration_event_name: (config as any).registration_event_name || "",
            });
        }
    }, [config]);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (field === "primary_metric") {
            const labels: Record<string, string> = {
                purchases: "Compras", leads: "Leads", messages: "Mensagens", registrations: "Cadastros", ftd: "FTD",
            };
            if (labels[value]) setFormData((prev) => ({ ...prev, primary_metric_label: labels[value] }));
        }
        if (field === "vertical" && value === "igaming") {
            setFormData((prev) => ({ ...prev, primary_metric: "ftd", primary_metric_label: "FTD" }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        await saveConfig({
            client_id: clientId,
            vertical: formData.vertical,
            primary_metric: formData.primary_metric,
            primary_metric_label: formData.primary_metric_label,
            cpa_target: formData.cpa_target ? Number(formData.cpa_target) : null,
            roas_target: formData.roas_target ? Number(formData.roas_target) : null,
            cost_per_ftd_target: formData.cost_per_ftd_target ? Number(formData.cost_per_ftd_target) : null,
            monthly_budget: null,
            notes: null,
            ftd_event_name: formData.ftd_event_name || null,
            ftd_google_conversion_name: formData.ftd_google_conversion_name || null,
            registration_event_name: formData.registration_event_name || null,
        } as any);
        setSaving(false);
    };

    const handleDiscoverEvents = async () => {
        await fetchAvailableEvents();
        setEventsModalOpen(true);
    };

    if (isLoading) return <div className="animate-pulse h-40 bg-[var(--surface)] rounded-xl" />;

    return (
        <>
            <Card className="border-white/5 bg-[var(--surface)] shadow-none mt-4">
                <CardHeader className="border-b border-white/5 pb-4">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
                        <BrainCircuit className="h-4 w-4 text-[var(--accent)]" />
                        Perfil de Análise (IA)
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                        Define como a inteligência artificial deve interpretar os dados deste cliente.
                    </p>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Vertical / Nicho</Label>
                            <Select value={formData.vertical} onValueChange={(v) => handleChange("vertical", v)}>
                                <SelectTrigger className="h-9 bg-[var(--surface2)] text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                                    <SelectItem value="infoproduto">Infoproduto</SelectItem>
                                    <SelectItem value="negocio_local">Negócio Local</SelectItem>
                                    <SelectItem value="geracao_leads">Geração de Leads B2B</SelectItem>
                                    <SelectItem value="igaming">iGaming / Apostas</SelectItem>
                                    <SelectItem value="app">Aplicativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Métrica Principal</Label>
                            <Select value={formData.primary_metric} onValueChange={(v) => handleChange("primary_metric", v)}>
                                <SelectTrigger className="h-9 bg-[var(--surface2)] text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="purchases">Compras</SelectItem>
                                    <SelectItem value="leads">Leads</SelectItem>
                                    <SelectItem value="messages">Mensagens</SelectItem>
                                    <SelectItem value="registrations">Cadastros</SelectItem>
                                    <SelectItem value="ftd">FTD (First Time Deposit)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Nome da Métrica (Display)</Label>
                            <Input value={formData.primary_metric_label} onChange={(e) => handleChange("primary_metric_label", e.target.value)} className="h-9 bg-[var(--surface2)] text-sm" placeholder="Ex: Compras" />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Meta de CPA (Opcional)</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">R$</span>
                                <Input type="number" value={formData.cpa_target} onChange={(e) => handleChange("cpa_target", e.target.value)} className="h-9 bg-[var(--surface2)] text-sm" placeholder="Ex: 50" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Meta de ROAS (Opcional)</Label>
                            <div className="flex items-center gap-2">
                                <Input type="number" value={formData.roas_target} onChange={(e) => handleChange("roas_target", e.target.value)} className="h-9 bg-[var(--surface2)] text-sm" placeholder="Ex: 3.5" />
                                <span className="text-xs text-muted-foreground">x</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Meta de Custo/FTD (Opcional)</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">R$</span>
                                <Input type="number" value={formData.cost_per_ftd_target} onChange={(e) => handleChange("cost_per_ftd_target", e.target.value)} className="h-9 bg-[var(--surface2)] text-sm" placeholder="Ex: 80" />
                            </div>
                        </div>
                    </div>

                    {(formData.vertical === "igaming" || formData.primary_metric === "ftd") && (
                        <div className="border-t border-white/5 pt-4 mt-4 space-y-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground font-semibold">Configuração de Evento FTD</Label>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p className="text-xs">
                                                Configure qual evento personalizado do Meta Ads ou Google Ads deve ser usado para rastrear FTD (First Time Deposit) separadamente do evento padrão de compra.
                                            </p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Evento FTD Meta Ads</Label>
                                    <div className="flex gap-1.5">
                                        <Input
                                            value={formData.ftd_event_name}
                                            onChange={(e) => handleChange("ftd_event_name", e.target.value)}
                                            className="h-9 bg-[var(--surface2)] text-sm flex-1"
                                            placeholder="Ex: offsite_conversion.custom.123456"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleDiscoverEvents}
                                            disabled={isLoadingEvents}
                                            className="h-9 px-2.5 shrink-0"
                                            title="Descobrir eventos disponíveis"
                                        >
                                            {isLoadingEvents ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground">
                                        action_type do evento personalizado de FTD no Meta Ads. Use o botão 🔍 para descobrir automaticamente.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Conversão FTD Google Ads</Label>
                                    <Input
                                        value={formData.ftd_google_conversion_name}
                                        onChange={(e) => handleChange("ftd_google_conversion_name", e.target.value)}
                                        className="h-9 bg-[var(--surface2)] text-sm"
                                        placeholder="Ex: FTD ou First Deposit"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        Nome da ação de conversão no Google Ads
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Evento de Cadastro Personalizado */}
                    <div className="border-t border-white/5 pt-4 mt-4 space-y-4">
                        <div className="flex items-center gap-2">
                            <Label className="text-xs text-muted-foreground font-semibold">Evento de Cadastro (Registrations)</Label>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <p className="text-xs">
                                            Se seu cliente usa um evento personalizado para cadastro no Meta Ads (diferente do padrão <code>complete_registration</code>), configure aqui. O sistema usará esse evento como fonte oficial de "Cadastros". Deixe vazio para usar o padrão.
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Evento de Cadastro Meta Ads</Label>
                                <div className="flex gap-1.5">
                                    <Input
                                        value={formData.registration_event_name}
                                        onChange={(e) => handleChange("registration_event_name", e.target.value)}
                                        className="h-9 bg-[var(--surface2)] text-sm flex-1"
                                        placeholder="Padrão: complete_registration"
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            await fetchAvailableEvents();
                                            setRegEventsModalOpen(true);
                                        }}
                                        disabled={isLoadingEvents}
                                        className="h-9 px-2.5 shrink-0"
                                        title="Descobrir eventos disponíveis"
                                    >
                                        {isLoadingEvents ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                    action_type do evento de cadastro no Meta Ads. Se vazio, usa <code>complete_registration</code> padrão.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                            <Save className="h-3.5 w-3.5" />
                            {saving ? "Salvando..." : "Salvar Perfil"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <EventDiscoveryModal
                open={eventsModalOpen}
                onOpenChange={setEventsModalOpen}
                events={availableEvents}
                isLoading={isLoadingEvents}
                currentValue={formData.ftd_event_name}
                onSelect={(actionType) => handleChange("ftd_event_name", actionType)}
                warnings={warnings}
            />
        </>
    );
}
