import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AnalysisAlert {
    titulo: string;
    descricao: string;
    acao: string;
    impacto_estimado: string;
    campanha: string | null;
}

export interface AnalysisOpportunity {
    titulo: string;
    descricao: string;
    acao: string;
    potencial: string;
    campanha: string | null;
}

export interface AnalysisOptimization {
    titulo: string;
    descricao: string;
    acao: string;
    prioridade: "alta" | "media" | "baixa";
    campanha: string | null;
}

export interface FunnelStageAction {
    etapa: string;
    diagnostico: string;
    status: "critico" | "atencao" | "saudavel";
    taxa_atual: string;
    benchmark: string;
    acoes: string[];
}

export interface AnalysisReport {
    id?: string;
    client_id: string;
    score: number;
    resumo: string;
    alertas_criticos: AnalysisAlert[];
    oportunidades: AnalysisOpportunity[];
    otimizacoes: AnalysisOptimization[];
    plano_acao?: FunnelStageAction[];
    tendencia_7d: "melhorando" | "estavel" | "piorando";
    previsao: string;
    dados_periodo?: Record<string, any>;
    modelo_ia?: string;
    vertical_usado?: string;
    metrica_primaria_usada?: string;
    anomalias?: { type: string; description: string }[];
    campanhas_decadencia?: { campaign_name: string; description: string }[];
    created_at?: string;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

export function useDeepAnalysis(clientId: string | undefined) {
    const queryClient = useQueryClient();

    // Fetch last analysis from cache (analysis_reports)
    const lastAnalysisQuery = useQuery({
        queryKey: ["last-analysis", clientId],
        queryFn: async (): Promise<AnalysisReport | null> => {
            if (!clientId) return null;

            const { data, error } = await (supabase
                .from("analysis_reports" as any)
                .select("*") as any)
                .eq("client_id", clientId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) {
                console.error("Error fetching last analysis:", error);
                return null;
            }

            return data as AnalysisReport | null;
        },
        enabled: !!clientId,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Mutation to invoke deep-analysis edge function
    const analyzeMutation = useMutation({
        mutationFn: async ({ targetClientId, force }: { targetClientId: string; force?: boolean }): Promise<AnalysisReport> => {
            // Check cache: if last analysis < 2h old and not forced, return it
            if (!force) {
                const lastAnalysis = lastAnalysisQuery.data;
                if (lastAnalysis?.created_at) {
                    const age = Date.now() - new Date(lastAnalysis.created_at).getTime();
                    if (age < TWO_HOURS_MS) {
                        toast.info("Usando análise recente (menos de 2h). Use 'Forçar nova análise' para refazer.");
                        return lastAnalysis;
                    }
                }
            }

            const { data, error } = await supabase.functions.invoke("deep-analysis", {
                body: { client_id: targetClientId },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            return data as AnalysisReport;
        },
        onSuccess: () => {
            toast.success("Análise profunda concluída.");
            queryClient.invalidateQueries({ queryKey: ["last-analysis", clientId] });
        },
        onError: (error: any) => {
            console.error("Deep analysis error:", error);
            toast.error(error.message || "Erro ao executar análise profunda.");
        },
    });

    // Delete analysis mutation
    const deleteMutation = useMutation({
        mutationFn: async (analysisId: string) => {
            const { error } = await (supabase
                .from("analysis_reports" as any)
                .delete() as any)
                .eq("id", analysisId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Análise excluída.");
            queryClient.invalidateQueries({ queryKey: ["last-analysis", clientId] });
        },
        onError: (error: any) => {
            console.error("Delete analysis error:", error);
            toast.error(error.message || "Erro ao excluir análise.");
        },
    });

    return {
        analysis: analyzeMutation.data ?? null,
        lastAnalysis: lastAnalysisQuery.data ?? null,
        isAnalyzing: analyzeMutation.isPending,
        isLoadingLast: lastAnalysisQuery.isLoading,
        isDeleting: deleteMutation.isPending,
        error: analyzeMutation.error?.message ?? null,
        analyze: (targetClientId: string) => analyzeMutation.mutate({ targetClientId }),
        forceAnalyze: (targetClientId: string) => analyzeMutation.mutate({ targetClientId, force: true }),
        deleteAnalysis: (analysisId: string) => deleteMutation.mutate(analysisId),
    };
}
