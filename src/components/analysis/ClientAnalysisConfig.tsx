import { useState, useEffect } from "react";
import { Save, BrainCircuit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClientAnalysisConfig } from "@/hooks/useClientAnalysisConfig";

export function ClientAnalysisConfig({ clientId }: { clientId: string }) {
    const { config, isLoading, saveConfig } = useClientAnalysisConfig(clientId);
    const [formData, setFormData] = useState({
        vertical: "ecommerce",
        primary_metric: "purchases",
        primary_metric_label: "Compras",
        cpa_target: "",
        roas_target: "",
        cost_per_ftd_target: "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (config) {
            setFormData({
                vertical: config.vertical || "ecommerce",
                primary_metric: config.primary_metric || "purchases",
                primary_metric_label: config.primary_metric_label || "Compras",
                cpa_target: config.cpa_target?.toString() || "",
                roas_target: config.roas_target?.toString() || "",
                cost_per_ftd_target: config.cost_per_ftd_target?.toString() || "",
            });
        }
    }, [config]);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Auto-update label when metric changes
        if (field === "primary_metric") {
            const labels: Record<string, string> = {
                purchases: "Compras",
                leads: "Leads",
                messages: "Mensagens",
                registrations: "Cadastros",
                ftd: "FTD",
            };
            if (labels[value]) {
                setFormData((prev) => ({ ...prev, primary_metric_label: labels[value] }));
            }
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
        });
        setSaving(false);
    };

    if (isLoading) return <div className="animate-pulse h-40 bg-[var(--surface)] rounded-xl" />;

    return (
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
                            <SelectTrigger className="h-9 bg-[var(--surface2)] text-sm">
                                <SelectValue />
                            </SelectTrigger>
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
                            <SelectTrigger className="h-9 bg-[var(--surface2)] text-sm">
                                <SelectValue />
                            </SelectTrigger>
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
                        <Input
                            value={formData.primary_metric_label}
                            onChange={(e) => handleChange("primary_metric_label", e.target.value)}
                            className="h-9 bg-[var(--surface2)] text-sm"
                            placeholder="Ex: Compras"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Meta de CPA (Opcional)</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">R$</span>
                            <Input
                                type="number"
                                value={formData.cpa_target}
                                onChange={(e) => handleChange("cpa_target", e.target.value)}
                                className="h-9 bg-[var(--surface2)] text-sm"
                                placeholder="Ex: 50"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Meta de ROAS (Opcional)</Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={formData.roas_target}
                                onChange={(e) => handleChange("roas_target", e.target.value)}
                                className="h-9 bg-[var(--surface2)] text-sm"
                                placeholder="Ex: 3.5"
                            />
                            <span className="text-xs text-muted-foreground">x</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Meta de Custo/FTD (Opcional)</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">R$</span>
                            <Input
                                type="number"
                                value={formData.cost_per_ftd_target}
                                onChange={(e) => handleChange("cost_per_ftd_target", e.target.value)}
                                className="h-9 bg-[var(--surface2)] text-sm"
                                placeholder="Ex: 80"
                            />
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
    );
}
