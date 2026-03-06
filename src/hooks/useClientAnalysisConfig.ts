import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ClientAnalysisConfig } from "@/types/analysis";

export function useClientAnalysisConfig(clientId: string | undefined) {
  const queryClient = useQueryClient();

  const configQuery = useQuery({
    queryKey: ["client-analysis-config", clientId],
    queryFn: async () => {
      if (!clientId) return null;

      const { data, error } = await supabase
        .from("client_analysis_config")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch analysis config:", error);
        return null;
      }

      return data as ClientAnalysisConfig | null;
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (config: {
      vertical: string;
      primary_metric: string;
      primary_metric_label: string;
      cpa_target: number | null;
      roas_target: number | null;
      monthly_budget: number | null;
      notes: string | null;
    }) => {
      if (!clientId) throw new Error("client_id obrigatório");

      const payload = {
        client_id: clientId,
        ...config,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("client_analysis_config")
        .upsert(payload, { onConflict: "client_id" })
        .select()
        .single();

      if (error) throw error;
      return data as ClientAnalysisConfig;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["client-analysis-config", clientId], data);
      toast.success("Configuração salva com sucesso!");
    },
    onError: (error: any) => {
      console.error("Failed to save analysis config:", error);
      toast.error("Erro ao salvar configuração");
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    saveConfig: saveMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
