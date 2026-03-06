import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AIInsight {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    type: "optimization" | "alert" | "opportunity";
}

export function useClientAnalysis() {
    const [insights, setInsights] = useState<AIInsight[]>([]);

    const mutation = useMutation({
        mutationFn: async ({ clientId, days = 30 }: { clientId: string; days?: number }) => {
            const { data, error } = await supabase.functions.invoke("analyze-client", {
                body: { client_id: clientId, days },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            return data.insights as AIInsight[];
        },
        onSuccess: (data) => {
            setInsights(data);
            toast.success("Análise concluída com sucesso.");
        },
        onError: (error: any) => {
            console.error("AI Analysis error:", error);
            toast.error(error.message || "Erro ao analisar dados com IA");
        },
    });

    return {
        analyze: (clientId: string, days?: number) => mutation.mutate({ clientId, days }),
        isAnalyzing: mutation.isPending,
        insights,
        error: mutation.error,
    };
}
