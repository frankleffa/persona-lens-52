import { useState, useCallback } from "react";
import {
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Minus,
    Sparkles,
    Lightbulb,
    Wrench,
    Clock,
    ChevronDown,
    ChevronRight,
    AlertCircle,
    RefreshCw,
    Trash2,
    Settings,
    Eye,
    Target,
    CheckCircle2,
    CircleAlert,
    ShieldAlert,
    Zap,
    Brain,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeepAnalysis } from "@/hooks/useDeepAnalysis";
import { useClientAnalysisConfig } from "@/hooks/useClientAnalysisConfig";
import { AIOptimizationDialog } from "./AIOptimizationDialog";
import { AutoOptimizeDialog } from "./AutoOptimizeDialog";
import type { AnalysisAlert, AnalysisOpportunity, AnalysisOptimization, FunnelStageAction } from "@/hooks/useDeepAnalysis";
import type { OptimizationInput } from "@/hooks/useAIOptimization";
import type { Recommendation } from "@/hooks/useAutoOptimize";

interface AnalysisDashboardProps {
    clientId: string;
    onOpenConfig?: () => void;
}

// ─── Score Circle ───

function ScoreCircle({ score }: { score: number }) {
    const color =
        score > 7 ? "#22c55e" : score >= 5 ? "#eab308" : "#ef4444";
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 10) * circumference;

    return (
        <div className="relative flex h-24 w-24 items-center justify-center">
            <svg className="absolute h-24 w-24 -rotate-90" viewBox="0 0 80 80">
                <circle
                    cx="40" cy="40" r={radius}
                    fill="none" stroke="var(--surface2)" strokeWidth="4"
                />
                <circle
                    cx="40" cy="40" r={radius}
                    fill="none" stroke={color} strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    strokeLinecap="round"
                    className="transition-all duration-700"
                />
            </svg>
            <span className="font-mono text-3xl font-bold" style={{ color }}>
                {score}
            </span>
        </div>
    );
}

// ─── Trend Badge ───

function TrendBadge({ trend }: { trend: string }) {
    if (trend === "melhorando") {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#22c55e]/10 px-2.5 py-1 text-xs font-semibold text-[#22c55e]">
                <TrendingUp className="h-3 w-3" /> Melhorando
            </span>
        );
    }
    if (trend === "piorando") {
        return (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#ef4444]/10 px-2.5 py-1 text-xs font-semibold text-[#ef4444]">
                <TrendingDown className="h-3 w-3" /> Piorando
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            <Minus className="h-3 w-3" /> Estável
        </span>
    );
}

// ─── Time ago helper ───

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "agora";
    if (hours === 1) return "há 1 hora";
    if (hours < 24) return `há ${hours} horas`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "há 1 dia" : `há ${days} dias`;
}

// ─── Collapsible Optimization Item ───

function OptimizationItem({
    opt,
    index,
    onToggle,
    onOptimize,
}: {
    opt: AnalysisOptimization;
    index: number;
    onToggle?: (checked: boolean) => void;
    onOptimize?: () => void;
}) {
    const [expanded, setExpanded] = useState(false);

    const priorityBadge = {
        alta: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
        media: "bg-[#eab308]/10 text-[#eab308] border-[#eab308]/20",
        baixa: "bg-white/5 text-muted-foreground border-white/5",
    };

    return (
        <div className="rounded-lg border border-white/5 bg-[var(--surface)] p-3 transition-colors hover:bg-[var(--surface2)]">
            <div className="flex items-start gap-3">
                <Checkbox
                    className="mt-0.5"
                    onCheckedChange={(checked) => onToggle?.(!!checked)}
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span
                            className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border ${priorityBadge[opt.prioridade] || priorityBadge.baixa}`}
                        >
                            {opt.prioridade}
                        </span>
                        <span className="text-sm font-medium text-foreground">{opt.titulo}</span>
                        {opt.campanha && (
                            <span className="metric-badge text-[10px]">{opt.campanha}</span>
                        )}
                    </div>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        {expanded ? "Menos detalhes" : "Ver detalhes"}
                    </button>
                    {expanded && (
                        <div className="mt-2 space-y-2 text-xs text-muted-foreground">
                            <p>{opt.descricao}</p>
                            <p className="text-[var(--accent)]">
                                <strong>Ação:</strong> {opt.acao}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onOptimize}
                                className="gap-1.5 mt-1 border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/10"
                            >
                                <Zap className="h-3 w-3" />
                                Executar com IA
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ───

export function AnalysisDashboard({ clientId, onOpenConfig }: AnalysisDashboardProps) {
    const { analysis, lastAnalysis, isAnalyzing, isLoadingLast, isDeleting, error, analyze, forceAnalyze, deleteAnalysis } = useDeepAnalysis(clientId);
    const { config, isLoading: isLoadingConfig } = useClientAnalysisConfig(clientId);
    const [optimizationTarget, setOptimizationTarget] = useState<OptimizationInput | null>(null);
    const [optimizationDialogOpen, setOptimizationDialogOpen] = useState(false);
    const [autoOptimizeOpen, setAutoOptimizeOpen] = useState(false);
    const [autoOptimizeRecs, setAutoOptimizeRecs] = useState<Recommendation[]>([]);

    const openOptimization = (input: OptimizationInput) => {
        setOptimizationTarget(input);
        setOptimizationDialogOpen(true);
    };

    const openAutoOptimize = () => {
        if (!report) return;
        const recs: Recommendation[] = [];
        for (const a of report.alertas_criticos || []) {
            recs.push({
                type: "alert",
                titulo: a.titulo,
                descricao: a.descricao,
                acao: a.acao,
                campanha: a.campanha,
                prioridade: "alta",
                impacto_estimado: a.impacto_estimado,
                external_campaign_id: (a as any).external_campaign_id || null,
                platform: (a as any).platform || null,
            });
        }
        for (const o of report.oportunidades || []) {
            recs.push({
                type: "opportunity",
                titulo: o.titulo,
                descricao: o.descricao,
                acao: o.acao,
                campanha: o.campanha,
                prioridade: "media",
                potencial: o.potencial,
                external_campaign_id: (o as any).external_campaign_id || null,
                platform: (o as any).platform || null,
            });
        }
        for (const opt of report.otimizacoes || []) {
            recs.push({
                type: "optimization",
                titulo: opt.titulo,
                descricao: opt.descricao,
                acao: opt.acao,
                campanha: opt.campanha,
                prioridade: opt.prioridade,
                external_campaign_id: (opt as any).external_campaign_id || null,
                platform: (opt as any).platform || null,
            });
        }
        setAutoOptimizeRecs(recs);
        setAutoOptimizeOpen(true);
    };

    const report = analysis || lastAnalysis;

    // ─── Loading state ───
    if (isLoadingConfig || isLoadingLast) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                </div>
                <Skeleton className="h-48 w-full rounded-xl" />
            </div>
        );
    }

    // ─── No config ───
    if (!config) {
        return (
            <Card className="border-[#eab308]/20 bg-[#eab308]/5">
                <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                    <Settings className="h-10 w-10 text-[#eab308]" />
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">
                            Configure o perfil de análise deste cliente
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Defina o vertical, métrica principal e metas para ativar a análise com IA.
                        </p>
                    </div>
                    <button
                        onClick={onOpenConfig}
                        className="rounded-md bg-[#eab308] px-6 py-2 text-sm font-semibold text-black transition-colors hover:bg-[#ca8a04]"
                    >
                        Configurar agora
                    </button>
                </CardContent>
            </Card>
        );
    }

    // ─── Has config but no analysis ───
    if (!report) {
        return (
            <Card className="border-white/5 bg-[var(--surface)]">
                <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                    <Sparkles className="h-10 w-10 text-[var(--accent)]" />
                    <div>
                        <h3 className="text-lg font-semibold text-foreground">Pronto para análise</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Vertical: <span className="text-foreground">{config.vertical}</span> · Métrica:{" "}
                            <span className="text-foreground">{config.primary_metric_label}</span>
                        </p>
                    </div>
                    <button
                        onClick={() => analyze(clientId)}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 rounded-md bg-[var(--accent)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent)]/80 disabled:opacity-50"
                    >
                        {isAnalyzing ? (
                            <>
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Analisando...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Executar primeira análise
                            </>
                        )}
                    </button>
                </CardContent>
            </Card>
        );
    }

    // ─── Full analysis view ───
    const alertas = report.alertas_criticos || [];
    const oportunidades = report.oportunidades || [];
    const otimizacoes = report.otimizacoes || [];
    const planoAcao: FunnelStageAction[] = (report as any).plano_acao || [];
    const sortedOpt = [...otimizacoes].sort((a, b) => {
        const order = { alta: 0, media: 1, baixa: 2 };
        return (order[a.prioridade] ?? 2) - (order[b.prioridade] ?? 2);
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── HEADER ── */}
            <Card className="border-white/5 bg-[var(--surface)]">
                <CardContent className="p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                        <ScoreCircle score={report.score} />

                        <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <TrendBadge trend={report.tendencia_7d} />
                                <span className="metric-badge text-[10px]">{config.vertical}</span>
                                <span className="metric-badge text-[10px]">{config.primary_metric_label}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                {report.resumo}
                            </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <button
                                onClick={openAutoOptimize}
                                disabled={isAnalyzing || (!alertas.length && !oportunidades.length && !otimizacoes.length)}
                                className="flex items-center gap-2 rounded-md bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-[var(--accent)]/80 disabled:opacity-40"
                            >
                                <Brain className="h-3 w-3" />
                                Otimizar Tudo com IA
                            </button>
                            <button
                                onClick={() => forceAnalyze(clientId)}
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 rounded-md border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-2 text-xs font-semibold text-[var(--accent)] transition-all hover:bg-[var(--accent)]/20 disabled:opacity-40"
                            >
                                {isAnalyzing ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-3 w-3" />
                                )}
                                {isAnalyzing ? "Analisando..." : "Refazer análise"}
                            </button>
                            <button
                                onClick={() => {
                                    if (report?.id && confirm("Tem certeza que deseja excluir esta análise?")) {
                                        deleteAnalysis(report.id);
                                    }
                                }}
                                disabled={isDeleting || isAnalyzing || !report?.id}
                                className="flex items-center gap-2 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/10 px-4 py-2 text-xs font-semibold text-[#ef4444] transition-all hover:bg-[#ef4444]/20 disabled:opacity-40"
                            >
                                <Trash2 className="h-3 w-3" />
                                {isDeleting ? "Excluindo..." : "Excluir análise"}
                            </button>
                            {report.created_at && (
                                <span className="text-[10px] text-muted-foreground">
                                    <Clock className="mr-1 inline h-3 w-3" />
                                    Última análise: {timeAgo(report.created_at)}
                                </span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── ERROR ── */}
            {error && (
                <Card className="border-[#ef4444]/20 bg-[#ef4444]/5">
                    <CardContent className="flex items-center gap-3 p-4">
                        <AlertCircle className="h-5 w-5 text-[#ef4444]" />
                        <p className="flex-1 text-sm text-[#ef4444]">{error}</p>
                        <button
                            onClick={() => analyze(clientId)}
                            className="text-xs font-semibold text-[#ef4444] underline hover:no-underline"
                        >
                            Tentar novamente
                        </button>
                    </CardContent>
                </Card>
            )}

            {/* ── ALERTAS CRÍTICOS ── */}
            {alertas.length > 0 && (
                <div className="space-y-3">
                    <div className="section-label">
                        <AlertTriangle className="h-3.5 w-3.5 text-[#ef4444]" />
                        Alertas Críticos
                        <Badge variant="destructive" className="ml-1 text-[10px]">
                            {alertas.length}
                        </Badge>
                    </div>
                    {alertas.map((a, i) => (
                        <Card key={i} className="border-l-2 border-l-[#ef4444] border-y-0 border-r-0 bg-[var(--surface)]">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-start justify-between">
                                    <h4 className="text-sm font-semibold text-foreground">{a.titulo}</h4>
                                    {a.campanha && <span className="metric-badge text-[10px]">{a.campanha}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground">{a.descricao}</p>
                                <div className="rounded-md bg-[#ef4444]/5 p-2">
                                    <p className="text-xs font-medium text-[#ef4444]">
                                        Ação recomendada: <span className="font-normal text-foreground">{a.acao}</span>
                                    </p>
                                </div>
                                {a.impacto_estimado && (
                                    <span className="inline-flex rounded bg-[#ef4444]/10 px-2 py-0.5 text-[10px] font-semibold text-[#ef4444]">
                                        Impacto: {a.impacto_estimado}
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openOptimization({ titulo: a.titulo, descricao: a.descricao, acao: a.acao, campanha: a.campanha, prioridade: "alta", context_type: "alert" })}
                                    className="gap-1.5 border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                                >
                                    <Zap className="h-3 w-3" />
                                    Executar com IA
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── OPORTUNIDADES ── */}
            {oportunidades.length > 0 && (
                <div className="space-y-3">
                    <div className="section-label">
                        <Lightbulb className="h-3.5 w-3.5 text-[#22c55e]" />
                        Oportunidades
                        <Badge className="ml-1 bg-[#22c55e]/10 text-[10px] text-[#22c55e] hover:bg-[#22c55e]/20">
                            {oportunidades.length}
                        </Badge>
                    </div>
                    {oportunidades.map((o, i) => (
                        <Card key={i} className="border-l-2 border-l-[#22c55e] border-y-0 border-r-0 bg-[var(--surface)]">
                            <CardContent className="p-4 space-y-2">
                                <div className="flex items-start justify-between">
                                    <h4 className="text-sm font-semibold text-foreground">{o.titulo}</h4>
                                    {o.campanha && <span className="metric-badge text-[10px]">{o.campanha}</span>}
                                </div>
                                <p className="text-xs text-muted-foreground">{o.descricao}</p>
                                <div className="rounded-md bg-[#22c55e]/5 p-2">
                                    <p className="text-xs font-medium text-[#22c55e]">
                                        Ação: <span className="font-normal text-foreground">{o.acao}</span>
                                    </p>
                                </div>
                                {o.potencial && (
                                    <span className="inline-flex rounded bg-[#22c55e]/10 px-2 py-0.5 text-[10px] font-semibold text-[#22c55e]">
                                        Potencial: {o.potencial}
                                    </span>
                                )}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openOptimization({ titulo: o.titulo, descricao: o.descricao, acao: o.acao, campanha: o.campanha, prioridade: "media", context_type: "opportunity" })}
                                    className="gap-1.5 border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/10"
                                >
                                    <Zap className="h-3 w-3" />
                                    Executar com IA
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* ── OTIMIZAÇÕES ── */}
            {sortedOpt.length > 0 && (
                <div className="space-y-3">
                    <div className="section-label">
                        <Wrench className="h-3.5 w-3.5 text-[var(--accent)]" />
                        Otimizações
                    </div>
                    {sortedOpt.map((opt, i) => (
                        <OptimizationItem key={i} opt={opt} index={i} onOptimize={() => openOptimization({ titulo: opt.titulo, descricao: opt.descricao, acao: opt.acao, campanha: opt.campanha, prioridade: opt.prioridade, context_type: "optimization" })} />
                    ))}
                </div>
            )}

            {/* ── PLANO DE AÇÃO POR ETAPA DO FUNIL ── */}
            {planoAcao.length > 0 && (
                <div className="space-y-3">
                    <div className="section-label">
                        <Target className="h-3.5 w-3.5 text-[var(--accent)]" />
                        Plano de Ação — Como Melhorar
                    </div>
                    {planoAcao.map((stage, i) => {
                        const statusConfig = {
                            critico: { icon: ShieldAlert, color: "#ef4444", bg: "bg-[#ef4444]/10", border: "border-l-[#ef4444]", label: "Crítico" },
                            atencao: { icon: CircleAlert, color: "#eab308", bg: "bg-[#eab308]/10", border: "border-l-[#eab308]", label: "Atenção" },
                            saudavel: { icon: CheckCircle2, color: "#22c55e", bg: "bg-[#22c55e]/10", border: "border-l-[#22c55e]", label: "Saudável" },
                        };
                        const cfg = statusConfig[stage.status] || statusConfig.atencao;
                        const StatusIcon = cfg.icon;

                        return (
                            <Card key={i} className={`border-l-2 ${cfg.border} border-y-0 border-r-0 bg-[var(--surface)]`}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                            <StatusIcon className="h-4 w-4" style={{ color: cfg.color }} />
                                            <h4 className="text-sm font-semibold text-foreground">{stage.etapa}</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`inline-flex rounded px-2 py-0.5 text-[10px] font-semibold ${cfg.bg}`} style={{ color: cfg.color }}>
                                                {cfg.label}
                                            </span>
                                            {stage.taxa_atual && (
                                                <span className="metric-badge text-[10px]">Taxa: {stage.taxa_atual}</span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{stage.diagnostico}</p>
                                    {stage.benchmark && (
                                        <p className="text-[10px] text-muted-foreground italic">
                                            Benchmark: {stage.benchmark}
                                        </p>
                                    )}
                                    {stage.acoes && stage.acoes.length > 0 && (
                                        <div className="space-y-1.5 rounded-md bg-[var(--surface2)] p-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Como melhorar:</p>
                                            {stage.acoes.map((acao, j) => (
                                                <div key={j} className="flex items-start gap-2">
                                                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold" style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}>
                                                        {j + 1}
                                                    </span>
                                                    <p className="text-xs text-foreground">{acao}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* ── PREVISÃO ── */}
            {report.previsao && (
                <Card className="border-white/5 bg-[var(--surface)]">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <Eye className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                            <div>
                                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Previsão
                                </h4>
                                <p className="mt-1 text-sm text-foreground">{report.previsao}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <AIOptimizationDialog
                open={optimizationDialogOpen}
                onOpenChange={setOptimizationDialogOpen}
                clientId={clientId}
                optimization={optimizationTarget}
            />

            <AutoOptimizeDialog
                open={autoOptimizeOpen}
                onOpenChange={setAutoOptimizeOpen}
                clientId={clientId}
                recommendations={autoOptimizeRecs}
            />
        </div>
    );
}
