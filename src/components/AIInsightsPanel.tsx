import { useState } from "react";
import { AIInsight } from "@/hooks/useClientAnalysis";
import { Sparkles, AlertTriangle, Lightbulb, Zap, ChevronDown } from "lucide-react";

interface AIInsightsPanelProps {
    insights: AIInsight[];
}

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
    const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

    if (!insights || insights.length === 0) return null;

    return (
        <div className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-xs animate-fade-in">
            <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-geist text-sm font-bold uppercase tracking-wider text-foreground">
                    Insights IA
                </h3>
            </div>

            <div className="flex flex-col">
                {insights.map((insight, idx) => {
                    const isExpanded = expandedIdx === idx;

                    const dotColor =
                        insight.type === "optimization"
                            ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]"
                            : insight.type === "alert"
                                ? "bg-red-500"
                                : "bg-blue-500 animate-pulse shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]";

                    const badgeBorder =
                        insight.type === "optimization"
                            ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                            : insight.type === "alert"
                                ? "border-red-500/40 text-red-600 dark:text-red-400"
                                : "border-blue-500/40 text-blue-600 dark:text-blue-400";

                    const TypeIcon =
                        insight.type === "alert"
                            ? AlertTriangle
                            : insight.type === "opportunity"
                                ? Lightbulb
                                : Zap;

                    return (
                        <div
                            key={idx}
                            className="border-b border-border/50 last:border-0"
                        >
                            <button
                                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                                className="flex w-full items-start gap-4 py-4 text-left transition-colors hover:bg-muted/30 rounded-lg px-2 -mx-2"
                            >
                                <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />

                                <div className="flex-1 min-w-0">
                                    <div className="mb-1 flex items-center justify-between gap-2">
                                        <h4 className="font-geist text-[13px] font-semibold text-foreground truncate">
                                            {insight.title}
                                        </h4>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badgeBorder}`}>
                                                <TypeIcon className="h-3 w-3" />
                                                {insight.type === "alert" ? "Alerta" : insight.type === "opportunity" ? "Oportunidade" : "Otimização"}
                                            </div>
                                            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                                        </div>
                                    </div>
                                    {!isExpanded && (
                                        <p className="font-geist text-[11px] leading-relaxed text-muted-foreground truncate">
                                            {insight.description}
                                        </p>
                                    )}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="animate-fade-in pb-4 pl-10 pr-2">
                                    <p className="font-geist text-[12px] leading-relaxed text-foreground/80 whitespace-pre-line">
                                        {insight.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
