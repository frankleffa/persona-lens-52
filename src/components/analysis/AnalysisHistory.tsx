import { useState, useMemo } from "react";
import {
    Bot,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Minus,
    BarChart3,
    Filter,
    ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalysisHistory } from "@/hooks/useAnalysisHistory";
import type { AnalysisReport } from "@/hooks/useDeepAnalysis";
import type { AutomationLog } from "@/hooks/useAutomation";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

interface AnalysisHistoryProps {
    clientId: string;
    days?: number;
}

// ─── Compare Card ───

function CompareCard({
    label,
    value,
    previous,
    suffix,
    prefix,
    invertColors,
}: {
    label: string;
    value: number;
    previous: number;
    suffix?: string;
    prefix?: string;
    invertColors?: boolean;
}) {
    const diff = previous > 0 ? ((value - previous) / previous) * 100 : 0;
    const isPositive = invertColors ? diff < 0 : diff > 0;
    const color = diff === 0 ? "text-muted-foreground" : isPositive ? "text-[#22c55e]" : "text-[#ef4444]";
    const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;

    return (
        <div className="space-y-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </span>
            <div className="font-mono text-lg font-bold text-foreground">
                {prefix}{typeof value === "number" ? value.toFixed(1) : value}{suffix}
            </div>
            {previous > 0 && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${color}`}>
                    <Icon className="h-3 w-3" />
                    {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                </span>
            )}
        </div>
    );
}

// ─── Timeline Item ───

function TimelineEntry({
    type,
    date,
    data,
}: {
    type: "report" | "automation";
    date: string;
    data: AnalysisReport | AutomationLog;
}) {
    const d = new Date(date);
    const timeStr = d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });

    if (type === "report") {
        const report = data as AnalysisReport;
        const scoreColor =
            report.score > 7 ? "#22c55e" : report.score >= 5 ? "#eab308" : "#ef4444";

        return (
            <div className="flex items-start gap-3 py-3 border-b border-white/3 last:border-0">
                <div
                    className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: `${scoreColor}15` }}
                >
                    <Sparkles className="h-3.5 w-3.5" style={{ color: scoreColor }} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">
                            Análise de IA
                        </span>
                        <span
                            className="font-mono text-xs font-bold"
                            style={{ color: scoreColor }}
                        >
                            {report.score}/10
                        </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">
                        {report.resumo}
                    </p>
                </div>
                <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                    {timeStr}
                </span>
            </div>
        );
    }

    const log = data as AutomationLog;
    const actionColors: Record<string, string> = {
        paused_campaign: "#ef4444",
        increased_budget: "#22c55e",
        alert_sent: "#eab308",
    };
    const actionLabels: Record<string, string> = {
        paused_campaign: "Campanha pausada",
        increased_budget: "Budget escalado",
        alert_sent: "Alerta gerado",
    };
    const color = actionColors[log.action] || "#1c9cf0";

    return (
        <div className="flex items-start gap-3 py-3 border-b border-white/3 last:border-0">
            <div
                className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                style={{ background: `${color}15` }}
            >
                <Bot className="h-3.5 w-3.5" style={{ color }} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">
                        {actionLabels[log.action] || log.action}
                    </span>
                    {log.status === "error" && (
                        <Badge variant="destructive" className="text-[9px] px-1 py-0">
                            Erro
                        </Badge>
                    )}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                    {log.campaign_name || "Ação geral"}
                </p>
            </div>
            <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                {timeStr}
            </span>
        </div>
    );
}

// ─── Main Component ───

export function AnalysisHistory({ clientId, days = 30 }: AnalysisHistoryProps) {
    const { reports, logs, timeline, weeklyAverage, isLoading } = useAnalysisHistory(clientId, days);

    const [filter, setFilter] = useState<"all" | "reports" | "actions">("all");
    const [visibleCount, setVisibleCount] = useState(20);

    // Chart data
    const chartData = useMemo(() => {
        return reports
            .filter((r) => r.score)
            .map((r) => ({
                date: new Date(r.created_at || "").toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                }),
                score: r.score,
                resumo: r.resumo?.substring(0, 80) || "",
            }))
            .reverse();
    }, [reports]);

    // Filtered timeline
    const filteredTimeline = useMemo(() => {
        if (filter === "reports") return timeline.filter((t) => t.type === "report");
        if (filter === "actions") return timeline.filter((t) => t.type === "automation");
        return timeline;
    }, [timeline, filter]);

    const visibleTimeline = filteredTimeline.slice(0, visibleCount);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-52 w-full rounded-xl" />
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-28 rounded-xl" />
                    <Skeleton className="h-28 rounded-xl" />
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* ── SCORE CHART ── */}
            <div className="space-y-3">
                <div className="section-label">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Evolução do Score
                </div>

                <Card className="border-white/5 bg-[var(--surface)]">
                    <CardContent className="p-4">
                        {chartData.length < 3 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center">
                                <BarChart3 className="h-8 w-8 text-muted-foreground/20" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Coletando dados. Após mais análises, o gráfico aparecerá.
                                </p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis
                                        dataKey="date"
                                        tick={{ fill: "var(--muted)", fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        domain={[0, 10]}
                                        tick={{ fill: "var(--muted)", fontSize: 10 }}
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            background: "var(--surface2)",
                                            border: "none",
                                            borderRadius: 8,
                                            fontSize: 12,
                                            color: "var(--text)",
                                        }}
                                        formatter={(value: any, name: string) => [value, "Score"]}
                                        labelFormatter={(label) => `Data: ${label}`}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="score"
                                        stroke="#f59e0b"
                                        strokeWidth={2}
                                        dot={{ fill: "#f59e0b", r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* ── WEEKLY COMPARISON ── */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="border-white/5 bg-[var(--surface)]">
                    <CardContent className="p-4">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Esta semana
                        </h4>
                        <CompareCard
                            label="Score médio"
                            value={weeklyAverage.current}
                            previous={weeklyAverage.previous}
                            suffix="/10"
                        />
                    </CardContent>
                </Card>
                <Card className="border-white/5 bg-[var(--surface)]">
                    <CardContent className="p-4">
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                            Semana anterior
                        </h4>
                        <div className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Score médio
                            </span>
                            <div className="font-mono text-lg font-bold text-foreground">
                                {weeklyAverage.previous > 0 ? `${weeklyAverage.previous.toFixed(1)}/10` : "—"}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── TIMELINE ── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="section-label">
                        <Filter className="h-3.5 w-3.5" />
                        Timeline de Eventos
                    </div>
                    <div className="flex gap-1">
                        {(["all", "reports", "actions"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition-colors ${filter === f
                                        ? "bg-[var(--accent)]/15 text-[var(--accent)]"
                                        : "text-muted-foreground hover:text-foreground"
                                    }`}
                            >
                                {f === "all" ? "Todos" : f === "reports" ? "Análises" : "Ações"}
                            </button>
                        ))}
                    </div>
                </div>

                <Card className="border-white/5 bg-[var(--surface)]">
                    <CardContent className="p-4">
                        {visibleTimeline.length === 0 ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Nenhum evento encontrado no período.
                            </p>
                        ) : (
                            <>
                                {visibleTimeline.map((item, i) => (
                                    <TimelineEntry key={i} {...item} />
                                ))}
                                {filteredTimeline.length > visibleCount && (
                                    <button
                                        onClick={() => setVisibleCount((c) => c + 20)}
                                        className="mt-3 flex w-full items-center justify-center gap-1 rounded-md py-2 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/5"
                                    >
                                        <ChevronDown className="h-3 w-3" />
                                        Carregar mais ({filteredTimeline.length - visibleCount} restantes)
                                    </button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
