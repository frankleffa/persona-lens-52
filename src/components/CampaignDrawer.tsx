import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Save, Trash2, Copy, MoveRight, Plus, X, Link2, Image as ImageIcon, Tag } from "lucide-react";
import type { Campaign, Platform, Objective, CTA, Creative, ChecklistItem, Label as LabelType } from "@/lib/execution-types";
import { LABEL_COLORS } from "@/lib/execution-types";
import { toast } from "sonner";

interface CampaignDrawerProps {
    campaign: Campaign | null;
    open: boolean;
    onClose: () => void;
    onSave: (campaign: Campaign) => void;
    onDelete: (id: string) => void;
    onDuplicate: (campaign: Campaign) => void;
    onMoveNext: (campaign: Campaign) => void;
    clients: Array<{ id: string; name: string }>;
}

export function CampaignDrawer({ campaign, open, onClose, onSave, onDelete, onDuplicate, onMoveNext, clients }: CampaignDrawerProps) {
    const [editedCampaign, setEditedCampaign] = useState<Campaign | null>(campaign);
    useEffect(() => { setEditedCampaign(campaign); }, [campaign]);
    const [newCreativeName, setNewCreativeName] = useState("");
    const [newCreativeUrl, setNewCreativeUrl] = useState("");
    const [newCreativeType, setNewCreativeType] = useState<"upload" | "link">("link");
    const [newChecklistItem, setNewChecklistItem] = useState("");
    const [newLabelText, setNewLabelText] = useState("");
    const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0].value);

    if (!campaign || !editedCampaign) return null;

    const handleSave = () => { onSave(editedCampaign); toast.success("Campanha salva!"); onClose(); };
    const handleDelete = () => { if (confirm("Excluir esta campanha?")) { onDelete(campaign.id); toast.success("Campanha excluída"); onClose(); } };
    const handleDuplicate = () => { onDuplicate(editedCampaign); toast.success("Campanha duplicada"); onClose(); };

    const addCreative = () => {
        if (!newCreativeName || !newCreativeUrl) { toast.error("Preencha nome e URL"); return; }
        const creative: Creative = { id: Date.now().toString(), name: newCreativeName, type: newCreativeType, url: newCreativeUrl };
        setEditedCampaign({ ...editedCampaign, creatives: [...editedCampaign.creatives, creative] });
        setNewCreativeName(""); setNewCreativeUrl("");
    };

    const removeCreative = (id: string) => {
        setEditedCampaign({ ...editedCampaign, creatives: editedCampaign.creatives.filter((c) => c.id !== id) });
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const item: ChecklistItem = { id: Date.now().toString(), text: newChecklistItem, checked: false };
        setEditedCampaign({ ...editedCampaign, checklist: [...editedCampaign.checklist, item] });
        setNewChecklistItem("");
    };

    const toggleChecklistItem = (id: string) => {
        setEditedCampaign({
            ...editedCampaign,
            checklist: editedCampaign.checklist.map((item) => item.id === id ? { ...item, checked: !item.checked } : item),
        });
    };

    const addLabel = () => {
        const label: LabelType = { id: Date.now().toString(), text: newLabelText, color: newLabelColor };
        setEditedCampaign({ ...editedCampaign, labels: [...editedCampaign.labels, label] });
        setNewLabelText("");
    };

    const removeLabel = (id: string) => {
        setEditedCampaign({ ...editedCampaign, labels: editedCampaign.labels.filter((l) => l.id !== id) });
    };

    const updateLabelText = (id: string, text: string) => {
        setEditedCampaign({
            ...editedCampaign,
            labels: editedCampaign.labels.map((l) => l.id === id ? { ...l, text } : l),
        });
    };

    const isVideo = editedCampaign.cover_url && /\.(mp4|webm|ogg)/i.test(editedCampaign.cover_url);

    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full sm:w-[540px] sm:max-w-[40vw] overflow-y-auto">
                <SheetHeader className="mb-6">
                    <SheetTitle className="text-xl font-bold">Detalhes da Campanha</SheetTitle>
                </SheetHeader>

                <div className="space-y-6">
                    {/* CAPA */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <ImageIcon className="h-4 w-4" /> Capa
                        </h3>
                        <Input
                            placeholder="URL da imagem ou vídeo de capa"
                            value={editedCampaign.cover_url || ""}
                            onChange={(e) => setEditedCampaign({ ...editedCampaign, cover_url: e.target.value })}
                        />
                        {editedCampaign.cover_url && (
                            <div className="rounded-lg overflow-hidden border border-border">
                                {isVideo ? (
                                    <video src={editedCampaign.cover_url} className="w-full h-[200px] object-cover" controls muted />
                                ) : (
                                    <img src={editedCampaign.cover_url} alt="Capa" className="w-full h-[200px] object-cover" />
                                )}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* LABELS */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Tag className="h-4 w-4" /> Labels
                        </h3>

                        {editedCampaign.labels.length > 0 && (
                            <div className="space-y-1.5">
                                {editedCampaign.labels.map((label) => (
                                    <div key={label.id} className="flex items-center gap-2">
                                        <div className="h-8 w-8 rounded" style={{ backgroundColor: label.color }} />
                                        <Input
                                            value={label.text}
                                            onChange={(e) => updateLabelText(label.id, e.target.value)}
                                            className="flex-1 h-8 text-sm"
                                            placeholder="Nome da label"
                                        />
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLabel(label.id)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <div className="flex gap-1">
                                {LABEL_COLORS.map((c) => (
                                    <button
                                        key={c.value}
                                        className={`h-7 w-7 rounded transition-all ${newLabelColor === c.value ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"}`}
                                        style={{ backgroundColor: c.value }}
                                        onClick={() => setNewLabelColor(c.value)}
                                        title={c.name}
                                    />
                                ))}
                            </div>
                            <Input
                                placeholder="Texto"
                                value={newLabelText}
                                onChange={(e) => setNewLabelText(e.target.value)}
                                className="flex-1 h-7 text-sm"
                                onKeyDown={(e) => e.key === "Enter" && addLabel()}
                            />
                            <Button size="sm" className="h-7 text-xs" onClick={addLabel}>
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* DESCRIÇÃO */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Descrição</h3>
                        <Textarea
                            value={editedCampaign.description}
                            onChange={(e) => setEditedCampaign({ ...editedCampaign, description: e.target.value })}
                            placeholder="Descreva a campanha, adicione contexto, briefing..."
                            rows={4}
                        />
                    </div>

                    <Separator />

                    {/* INFORMAÇÕES GERAIS */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Informações Gerais</h3>
                        <div>
                            <Label htmlFor="campaign-name">Nome da Campanha</Label>
                            <Input id="campaign-name" value={editedCampaign.campaign_name} onChange={(e) => setEditedCampaign({ ...editedCampaign, campaign_name: e.target.value })} />
                        </div>
                        <div>
                            <Label htmlFor="client">Cliente</Label>
                            <Select value={editedCampaign.client_id} onValueChange={(value) => {
                                const client = clients.find((c) => c.id === value);
                                setEditedCampaign({ ...editedCampaign, client_id: value, client_name: client?.name || "" });
                            }}>
                                <SelectTrigger id="client"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="platform">Plataforma</Label>
                            <Select value={editedCampaign.platform} onValueChange={(value) => setEditedCampaign({ ...editedCampaign, platform: value as Platform })}>
                                <SelectTrigger id="platform"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Meta Ads">Meta Ads</SelectItem>
                                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                                    <SelectItem value="TikTok Ads">TikTok Ads</SelectItem>
                                    <SelectItem value="LinkedIn Ads">LinkedIn Ads</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="objective">Objetivo</Label>
                            <Select value={editedCampaign.objective} onValueChange={(value) => setEditedCampaign({ ...editedCampaign, objective: value as Objective })}>
                                <SelectTrigger id="objective"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Conversão">Conversão</SelectItem>
                                    <SelectItem value="Geração de Leads">Geração de Leads</SelectItem>
                                    <SelectItem value="Branding">Branding</SelectItem>
                                    <SelectItem value="Tráfego">Tráfego</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="budget">Orçamento (R$)</Label>
                                <Input id="budget" type="number" value={editedCampaign.budget} onChange={(e) => setEditedCampaign({ ...editedCampaign, budget: Number(e.target.value) })} />
                            </div>
                            <div>
                                <Label htmlFor="start-date">Data de Início</Label>
                                <Input id="start-date" type="date" value={editedCampaign.start_date} onChange={(e) => setEditedCampaign({ ...editedCampaign, start_date: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* CRIATIVOS */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Criativos</h3>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input placeholder="Nome do criativo" value={newCreativeName} onChange={(e) => setNewCreativeName(e.target.value)} className="flex-1" />
                                <Select value={newCreativeType} onValueChange={(v) => setNewCreativeType(v as "upload" | "link")}>
                                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="link">Link</SelectItem>
                                        <SelectItem value="upload">Upload</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Input placeholder={newCreativeType === "link" ? "URL do criativo" : "Arquivo"} value={newCreativeUrl} onChange={(e) => setNewCreativeUrl(e.target.value)} className="flex-1" />
                                <Button size="sm" onClick={addCreative} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Adicionar</Button>
                            </div>
                        </div>
                        {editedCampaign.creatives.length > 0 && (
                            <div className="space-y-2">
                                {editedCampaign.creatives.map((creative) => (
                                    <div key={creative.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2">
                                        {creative.type === "link" ? <Link2 className="h-4 w-4 text-muted-foreground" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{creative.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{creative.url}</p>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeCreative(creative.id)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* COPY DO ANÚNCIO */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Copy do Anúncio</h3>
                        <div>
                            <Label htmlFor="headline">Headline</Label>
                            <Input id="headline" value={editedCampaign.copy.headline} onChange={(e) => setEditedCampaign({ ...editedCampaign, copy: { ...editedCampaign.copy, headline: e.target.value } })} />
                        </div>
                        <div>
                            <Label htmlFor="primary-text">Texto Principal</Label>
                            <Textarea id="primary-text" value={editedCampaign.copy.primary_text} onChange={(e) => setEditedCampaign({ ...editedCampaign, copy: { ...editedCampaign.copy, primary_text: e.target.value } })} rows={3} />
                        </div>
                        <div>
                            <Label htmlFor="description">Descrição</Label>
                            <Textarea id="description" value={editedCampaign.copy.description} onChange={(e) => setEditedCampaign({ ...editedCampaign, copy: { ...editedCampaign.copy, description: e.target.value } })} rows={2} />
                        </div>
                        <div>
                            <Label htmlFor="cta">CTA</Label>
                            <Select value={editedCampaign.copy.cta} onValueChange={(value) => setEditedCampaign({ ...editedCampaign, copy: { ...editedCampaign.copy, cta: value as CTA } })}>
                                <SelectTrigger id="cta"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Comprar Agora">Comprar Agora</SelectItem>
                                    <SelectItem value="Saiba Mais">Saiba Mais</SelectItem>
                                    <SelectItem value="Cadastre-se">Cadastre-se</SelectItem>
                                    <SelectItem value="Baixar">Baixar</SelectItem>
                                    <SelectItem value="Entrar em Contato">Entrar em Contato</SelectItem>
                                    <SelectItem value="Inscrever-se">Inscrever-se</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Separator />

                    {/* CHECKLIST */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Checklist de Setup</h3>
                        <div className="space-y-2">
                            {editedCampaign.checklist.map((item) => (
                                <div key={item.id} className="flex items-center gap-2">
                                    <Checkbox id={`check-${item.id}`} checked={item.checked} onCheckedChange={() => toggleChecklistItem(item.id)} />
                                    <label htmlFor={`check-${item.id}`} className={`text-sm flex-1 cursor-pointer ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                        {item.text}
                                    </label>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <Input placeholder="Novo item do checklist" value={newChecklistItem} onChange={(e) => setNewChecklistItem(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChecklistItem()} className="flex-1" />
                            <Button size="sm" onClick={addChecklistItem} className="gap-1.5"><Plus className="h-3.5 w-3.5" />Adicionar</Button>
                        </div>
                    </div>

                    <Separator />

                    {/* OBSERVAÇÕES */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Observações</h3>
                        <Textarea value={editedCampaign.notes} onChange={(e) => setEditedCampaign({ ...editedCampaign, notes: e.target.value })} placeholder="Anotações gerais..." rows={4} />
                    </div>

                    {/* AÇÕES */}
                    <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                        <Button onClick={handleSave} className="gap-2 flex-1"><Save className="h-4 w-4" />Salvar</Button>
                        <Button onClick={handleDuplicate} variant="outline" className="gap-2"><Copy className="h-4 w-4" />Duplicar</Button>
                        <Button onClick={() => onMoveNext(editedCampaign)} variant="outline" className="gap-2"><MoveRight className="h-4 w-4" />Próxima Etapa</Button>
                        <Button onClick={handleDelete} variant="destructive" className="gap-2"><Trash2 className="h-4 w-4" />Excluir</Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
