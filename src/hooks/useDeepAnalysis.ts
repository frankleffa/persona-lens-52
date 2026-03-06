import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AnalysisReport } from "@/types/analysis";

const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export function useDeepAnalysis(clientId: string | undefined) {
  const [report, setReport] = useState<AnalysisReport | null>(null);

  // Fetch last saved analysis from DB (cache)
  const lastAnalysisQuery = useQuery({
    queryKey: ["deep-analysis", "last", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from("analysis_reports")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch last analysis:", error);
        return null;
      }

      return data as AnalysisReport | null;
    },
    enabled: !!clientId,
    staleTime: 60_000, // 1 min
  });

  const lastAnalysis = report || lastAnalysisQuery.data;

  // Check if cached analysis is still fresh (< 2h old)
  const isCacheFresh = useCallback(() => {
    if (!lastAnalysis?.created_at) return false;
    const age = Date.now() - new Date(lastAnalysis.created_at).getTime();
    return age < CACHE_TTL_MS;
  }, [lastAnalysis]);

  // Mutation to invoke deep-analysis Edge Function
  const mutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("client_id obrigatório");

      const { data, error } = await supabase.functions.invoke("deep-analysis", {
        body: { client_id: clientId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data.report as AnalysisReport;
    },
    onSuccess: (data) => {
      setReport(data);
      lastAnalysisQuery.refetch();
      toast.success("Análise profunda concluída!");
    },
    onError: (error: any) => {
      console.error("Deep analysis error:", error);
      toast.error(error.message || "Erro ao gerar análise profunda");
    },
  });

  const analyze = useCallback(() => {
    // If cache is fresh, skip calling Claude
    if (isCacheFresh()) {
      toast.info("Usando análise recente (menos de 2h). Clique novamente para forçar uma nova.");
      return;
    }
    mutation.mutate();
  }, [isCacheFresh, mutation]);

  const forceAnalyze = useCallback(() => {
    mutation.mutate();
  }, [mutation]);

  return {
    analysis: lastAnalysis,
    isAnalyzing: mutation.isPending,
    isLoadingCache: lastAnalysisQuery.isLoading,
    error: mutation.error,
    analyze,
    forceAnalyze,
    isCacheFresh: isCacheFresh(),
  };
}
