import { AIInsight } from "@/hooks/useClientAnalysis";
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";

interface AIAnalysisButtonProps {
    onAnalyze: () => void;
    isAnalyzing: boolean;
    insights: AIInsight[];
    error: any;
}

export function AIAnalysisButton({ onAnalyze, isAnalyzing, insights, error }: AIAnalysisButtonProps) {
    if (isAnalyzing) {
        return (
            <button
                disabled
                className="flex items-center gap-2 rounded-md border border-border px-4 py-2 font-geist text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground transition-all"
            >
                <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                </span>
                Analisando...
            </button>
        );
    }

    if (error) {
        return (
            <button
                onClick={onAnalyze}
                className="flex items-center gap-2 rounded-md border border-neg/20 bg-neg/10 px-4 py-2 font-geist text-[12px] font-semibold uppercase tracking-[0.06em] text-neg transition-all hover:bg-neg/20"
            >
                <AlertCircle className="h-3 w-3" />
                Erro — tentar novamente
            </button>
        );
    }

    if (insights.length > 0) {
        return (
            <button
                onClick={onAnalyze}
                className="flex items-center gap-2 rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-2 font-geist text-[12px] font-semibold uppercase tracking-[0.06em] text-blue-500 transition-all hover:bg-blue-500/20"
            >
                <CheckCircle2 className="h-3 w-3" />
                {insights.length} insights gerados
            </button>
        );
    }

    return (
        <button
            onClick={onAnalyze}
            className="flex items-center gap-2 rounded-md border border-border2 bg-transparent px-4 py-2 font-geist text-[12px] font-semibold uppercase tracking-[0.06em] text-muted-foreground transition-all hover:border-border hover:text-foreground"
        >
            <Sparkles className="h-3 w-3" />
            Analisar com IA
        </button>
    );
}
