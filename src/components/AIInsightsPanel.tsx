import { AIInsight } from "@/hooks/useClientAnalysis";
import { Sparkles, AlertTriangle, Lightbulb, Zap } from "lucide-react";

interface AIInsightsPanelProps {
    insights: AIInsight[];
}

export function AIInsightsPanel({ insights }: AIInsightsPanelProps) {
    if (!insights || insights.length === 0) return null;

    return (
        <div className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-sm animate-fade-in">
            <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-geist text-sm font-bold uppercase tracking-wider text-foreground">
                    Insights IA
                </h3>
            </div>

            <div className="flex flex-col">
                {insights.map((insight, idx) => {
                    const dotColor =
                        insight.type === "optimization"
                            ? "bg-emerald-500"
                            : insight.type === "alert"
                                ? "bg-red-500"
                                : "bg-blue-500 animate-pulse";

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
                            className="flex items-start gap-4 border-b border-border/50 py-4 last:border-0 last:pb-0"
                        >
                            <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />

                            <div className="flex-1">
                                <div className="mb-1 flex items-center justify-between">
                                    <h4 className="font-geist text-[13px] font-semibold text-foreground">
                                        {insight.title}
                                    </h4>
                                    <div className={`flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${badgeBorder}`}>
                                        <TypeIcon className="h-3 w-3" />
                                        {insight.type === "alert" ? "Alerta" : insight.type === "opportunity" ? "Oportunidade" : "Otimização"}
                                    </div>
                                </div>
                                <p className="font-geist text-[11px] leading-relaxed text-muted-foreground">
                                    {insight.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
