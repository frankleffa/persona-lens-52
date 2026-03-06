import { useState } from "react";
import {
    Play,
    Bot,
    PauseCircle,
    TrendingUp,
    AlertTriangle,
    Bell,
    Clock,
    CheckCircle,
    XCircle,
    SkipForward,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useAutomation } from "@/hooks/useAutomation";
import { useClientAnalysisConfig } from "@/hooks/useClientAnalysisConfig";
import type { AutomationRule, AutomationLog, CreateRuleInput } from "@/hooks/useAutomation";

interface AutomationConfigProps {
    clientId: string;
}

// ─── Rule Card ───

function RuleCard({
    title,
    description,
    icon: Icon,
    iconColor,
    rule,
    children,
    onToggle,
}: {
    title: string;
    description: string;
    icon: any;
    iconColor: string;
    rule: AutomationRule | undefined;
    children: React.ReactNode;
    onToggle: (active: boolean) => void;
}) {
    return (
        <Card className="border-white/5 bg-[var(--surface)]">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-8 w-8 items-center justify-center rounded-lg"
                            style={{ background: `${iconColor}15` }}
                        >
                            <Icon className="h-4 w-4" style={{ color: iconColor }} />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-foreground">{title}</h4>
                            <p className="text-[11px] text-muted-foreground">{description}</p>
                        </div>
                    </div>
                    <Switch
                        checked={rule?.is_active ?? false}
                        onCheckedChange={onToggle}
                    />
                </div>
                {(rule?.is_active) && (
                    <div className="space-y-3 border-t border-white/5 pt-3">
                        {children}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Input Field ───

function ConfigField({
    label,
    value,
    onChange,
    type = "number",
    prefix,
    suffix,
}: {
    label: string;
    value: string | number;
    onChange: (v: string) => void;
    type?: string;
    prefix?: string;
    suffix?: string;
}) {
    return (
        <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">{label}</Label>
            <div className="flex items-center gap-1.5">
                {prefix && <span className="text-xs text-muted-foreground">{prefix}</span>}
                <Input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="h-8 bg-[var(--surface2)] text-sm"
                />
                {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
            </div>
        </div>
    );
}

// ─── Action Badge ───

function ActionBadge({ action, status }: { action: string; status: string }) {
    if (status === "error") {
        return (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#ef4444]/10 text-[#ef4444]">
                <XCircle className="h-3 w-3" /> Erro
            </span>
        );
    }
    if (status === "skipped") {
        return (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/5 text-muted-foreground">
                <SkipForward className="h-3 w-3" /> Ignorado
            </span>
        );
    }
    if (action === "paused_campaign") {
        return (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#ef4444]/10 text-[#ef4444]">
                <PauseCircle className="h-3 w-3" /> Pausado
            </span>
        );
    }
    if (action === "increased_budget") {
        return (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#22c55e]/10 text-[#22c55e]">
                <TrendingUp className="h-3 w-3" /> Escalado
            </span>
        );
    }
    if (action === "alert_sent") {
        return (
            <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-[#eab308]/10 text-[#eab308]">
                <Bell className="h-3 w-3" /> Alerta
            </span>
        );
    }
    return (
        <span className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold bg-white/5 text-muted-foreground">
            {action}
        </span>
    );
}

// ─── Format date ───

function formatDateTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ─── Main Component ───

export function AutomationConfig({ clientId }: AutomationConfigProps) {
    const { rules, logs, isLoading, createRule, updateRule, deleteRule, triggerOptimize, isOptimizing } = useAutomation(clientId);
    const { config } = useClientAnalysisConfig(clientId);

    const metricLabel = config?.primary_metric_label || "Compras";

    // Find existing rules by type
    const findRule = (type: AutomationRule["rule_type"]) => rules.find((r) => r.rule_type === type);

    // Local state for editing
    const [pauseCpa, setPauseCpa] = useState<Record<string, any>>({});
    const [scaleGood, setScaleGood] = useState<Record<string, any>>({});
    const [pauseNoConv, setPauseNoConv] = useState<Record<string, any>>({});
    const [alertOnly, setAlertOnly] = useState<Record<string, any>>({});

    // Get config for a rule, merging local edits
    const getCondition = (rule: AutomationRule | undefined, local: Record<string, any>) => {
        return { ...(rule?.condition || {}), ...local };
    };

    // Toggle handler: create rule if doesn't exist, toggle if exists
    const handleToggle = (type: AutomationRule["rule_type"], active: boolean, defaultCondition: Record<string, any>) => {
        const existing = findRule(type);
        if (existing) {
            updateRule({ id: existing.id, is_active: active });
        } else if (active) {
            createRule({ client_id: clientId, rule_type: type, is_active: true, condition: defaultCondition, action: {} });
        }
    };

    // Save config change
    const handleConditionChange = (type: AutomationRule["rule_type"], key: string, value: any) => {
        const existing = findRule(type);
        if (existing) {
            const newCondition = { ...existing.condition, [key]: value };
            updateRule({ id: existing.id, condition: newCondition });
        }
    };

    const pauseCpaRule = findRule("pause_high_cpa");
    const scaleRule = findRule("scale_good_performer");
    const noConvRule = findRule("pause_no_conversion");
    const alertRule = findRule("alert_only");

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── HEADER ── */}
            <div className="flex items-center justify-between">
                <div className="section-label">
                    <Bot className="h-3.5 w-3.5" />
                    Regras de Automação
                </div>
                <button
                    onClick={() => triggerOptimize(clientId)}
                    disabled={isOptimizing || rules.filter((r) => r.is_active).length === 0}
                    className="flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent)]/80 disabled:opacity-40"
                >
                    {isOptimizing ? (
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                        </span>
                    ) : (
                        <Play className="h-3 w-3" />
                    )}
                    {isOptimizing ? "Otimizando..." : "Executar otimização agora"}
                </button>
            </div>

            {/* ── RULE CARDS ── */}
            <RuleCard
                title="Pausar CPA alto"
                description={`Pausa campanhas com custo por ${metricLabel} acima do limite`}
                icon={PauseCircle}
                iconColor="#ef4444"
                rule={pauseCpaRule}
                onToggle={(active) => handleToggle("pause_high_cpa", active, { cpa_limit: 150, min_spend: 100, lookback_days: 7 })}
            >
                <ConfigField
                    label={`Pausar se custo por ${metricLabel} acima de`}
                    value={pauseCpaRule?.config?.cpa_limit ?? 150}
                    prefix="R$"
                    onChange={(v) => handleConfigChange("pause_high_cpa", "cpa_limit", Number(v))}
                />
                <ConfigField
                    label="Mínimo investido para avaliar"
                    value={pauseCpaRule?.config?.min_spend ?? 100}
                    prefix="R$"
                    onChange={(v) => handleConfigChange("pause_high_cpa", "min_spend", Number(v))}
                />
                <ConfigField
                    label="Dias de análise"
                    value={pauseCpaRule?.config?.lookback_days ?? 7}
                    suffix="dias"
                    onChange={(v) => handleConfigChange("pause_high_cpa", "lookback_days", Number(v))}
                />
            </RuleCard>

            <RuleCard
                title="Escalar bons performers"
                description="Aumenta budget de campanhas com ROAS consistente"
                icon={TrendingUp}
                iconColor="#22c55e"
                rule={scaleRule}
                onToggle={(active) => handleToggle("scale_good_performer", active, { roas_min: 2.0, budget_increase_pct: 20, max_daily_budget: 500 })}
            >
                <ConfigField
                    label="ROAS mínimo para escalar"
                    value={scaleRule?.config?.roas_min ?? 2.0}
                    suffix="x"
                    onChange={(v) => handleConfigChange("scale_good_performer", "roas_min", Number(v))}
                />
                <ConfigField
                    label="Aumento de budget"
                    value={scaleRule?.config?.budget_increase_pct ?? 20}
                    suffix="%"
                    onChange={(v) => handleConfigChange("scale_good_performer", "budget_increase_pct", Number(v))}
                />
                <ConfigField
                    label="Budget máximo diário"
                    value={scaleRule?.config?.max_daily_budget ?? 500}
                    prefix="R$"
                    onChange={(v) => handleConfigChange("scale_good_performer", "max_daily_budget", Number(v))}
                />
                <p className="text-[10px] text-muted-foreground">
                    ⚠️ Limite de segurança: máximo 30% de aumento por dia
                </p>
            </RuleCard>

            <RuleCard
                title="Pausar sem conversão"
                description={`Pausa campanhas que gastaram sem gerar ${metricLabel}`}
                icon={AlertTriangle}
                iconColor="#eab308"
                rule={noConvRule}
                onToggle={(active) => handleToggle("pause_no_conversion", active, { min_spend: 200, min_days: 3 })}
            >
                <ConfigField
                    label="Investimento mínimo"
                    value={noConvRule?.config?.min_spend ?? 200}
                    prefix="R$"
                    onChange={(v) => handleConfigChange("pause_no_conversion", "min_spend", Number(v))}
                />
                <ConfigField
                    label={`Dias sem ${metricLabel}`}
                    value={noConvRule?.config?.min_days ?? 3}
                    suffix="dias"
                    onChange={(v) => handleConfigChange("pause_no_conversion", "min_days", Number(v))}
                />
            </RuleCard>

            <RuleCard
                title="Apenas alertar"
                description="Monitora uma métrica e registra alertas sem agir"
                icon={Bell}
                iconColor="#1c9cf0"
                rule={alertRule}
                onToggle={(active) => handleToggle("alert_only", active, { metric: "cpa", threshold: 100, direction: "above" })}
            >
                <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Métrica a monitorar</Label>
                    <Select
                        value={alertRule?.config?.metric ?? "cpa"}
                        onValueChange={(v) => handleConfigChange("alert_only", "metric", v)}
                    >
                        <SelectTrigger className="h-8 bg-[var(--surface2)] text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cpa">CPA</SelectItem>
                            <SelectItem value="roas">ROAS</SelectItem>
                            <SelectItem value="spend">Investimento</SelectItem>
                            <SelectItem value="clicks">Cliques</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <ConfigField
                    label="Threshold"
                    value={alertRule?.config?.threshold ?? 100}
                    onChange={(v) => handleConfigChange("alert_only", "threshold", Number(v))}
                />
                <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Direção</Label>
                    <Select
                        value={alertRule?.config?.direction ?? "above"}
                        onValueChange={(v) => handleConfigChange("alert_only", "direction", v)}
                    >
                        <SelectTrigger className="h-8 bg-[var(--surface2)] text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="above">Acima de</SelectItem>
                            <SelectItem value="below">Abaixo de</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </RuleCard>

            {/* ── LOG DE AÇÕES ── */}
            <div className="space-y-3">
                <div className="section-label">
                    <Clock className="h-3.5 w-3.5" />
                    Histórico de Ações
                </div>

                {logs.length === 0 ? (
                    <Card className="border-white/5 bg-[var(--surface)]">
                        <CardContent className="py-8 text-center">
                            <Bot className="mx-auto h-8 w-8 text-muted-foreground/30" />
                            <p className="mt-2 text-sm text-muted-foreground">
                                Nenhuma ação automática executada ainda
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <Card className="border-white/5 bg-[var(--surface)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            Data/Hora
                                        </th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            Campanha
                                        </th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            Ação
                                        </th>
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                                            Detalhes
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className="border-b border-white/3 hover:bg-[var(--surface2)]">
                                            <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                                                {formatDateTime(log.created_at)}
                                            </td>
                                            <td className="px-4 py-2 text-foreground max-w-[200px] truncate">
                                                {log.campaign_name || "—"}
                                            </td>
                                            <td className="px-4 py-2">
                                                <ActionBadge action={log.action} status={log.status} />
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground max-w-[250px] truncate">
                                                {log.error_message || (
                                                    log.details
                                                        ? Object.entries(log.details)
                                                            .slice(0, 3)
                                                            .map(([k, v]) => `${k}: ${v}`)
                                                            .join(" · ")
                                                        : "—"
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
