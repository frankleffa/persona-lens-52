import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CreativeReferenceAd {
  ad_name?: string;
  campaign_name?: string;
  spend?: number;
  cpa?: number | null;
  ctr?: number | null;
}

export type CreativeSuggestionStatus = "pending" | "used" | "discarded";

export interface CreativeSuggestion {
  id: string;
  client_id: string;
  generated_by: string | null;
  replaces_ad_name: string | null;
  hook: string;
  headline: string;
  primary_text: string;
  cta: string | null;
  angulo: string | null;
  por_que_funciona: string | null;
  status: CreativeSuggestionStatus;
  reference_ads: CreativeReferenceAd[];
  context_note: string | null;
  modelo_ia: string | null;
  created_at: string;
  updated_at: string;
}

interface GenerateArgs {
  replacesAdName?: string;
  contextNote?: string;
}

interface GenerateResult {
  suggestions: CreativeSuggestion[];
  references_used: number;
  modelo_ia: string;
}

export function useCreativeSuggestions(clientId: string | undefined) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["creative-suggestions", clientId],
    queryFn: async (): Promise<CreativeSuggestion[]> => {
      if (!clientId) return [];

      const { data, error } = await (supabase
        .from("creative_suggestions" as any)
        .select("*") as any)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching creative suggestions:", error);
        return [];
      }

      return (data ?? []) as CreativeSuggestion[];
    },
    enabled: !!clientId,
    staleTime: 60 * 1000,
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      replacesAdName,
      contextNote,
    }: GenerateArgs): Promise<GenerateResult> => {
      if (!clientId) throw new Error("Cliente nao selecionado");

      const { data, error } = await supabase.functions.invoke(
        "generate-creatives",
        {
          body: {
            client_id: clientId,
            replaces_ad_name: replacesAdName?.trim() || undefined,
            context_note: contextNote?.trim() || undefined,
          },
        }
      );

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data as GenerateResult;
    },
    onSuccess: (result) => {
      const count = result.suggestions?.length ?? 0;
      toast.success(`${count} variacoes geradas com base em ${result.references_used} anuncio(s) de referencia.`);
      queryClient.invalidateQueries({ queryKey: ["creative-suggestions", clientId] });
    },
    onError: (error: any) => {
      console.error("Generate creatives error:", error);
      toast.error(error.message || "Erro ao gerar criativos.");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: CreativeSuggestionStatus;
    }) => {
      const { error } = await (supabase
        .from("creative_suggestions" as any)
        .update({ status }) as any)
        .eq("id", id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: ({ status }) => {
      const label = status === "used" ? "marcado como usado" : status === "discarded" ? "descartado" : "atualizado";
      toast.success(`Criativo ${label}.`);
      queryClient.invalidateQueries({ queryKey: ["creative-suggestions", clientId] });
    },
    onError: (error: any) => {
      console.error("Update creative status error:", error);
      toast.error(error.message || "Erro ao atualizar criativo.");
    },
  });

  const suggestions = listQuery.data ?? [];
  const pending = suggestions.filter((s) => s.status === "pending");
  const used = suggestions.filter((s) => s.status === "used");

  return {
    suggestions,
    pending,
    used,
    isLoading: listQuery.isLoading,
    isGenerating: generateMutation.isPending,
    isUpdating: updateStatusMutation.isPending,
    generate: (args: GenerateArgs = {}) => generateMutation.mutateAsync(args),
    markUsed: (id: string) => updateStatusMutation.mutate({ id, status: "used" }),
    discard: (id: string) => updateStatusMutation.mutate({ id, status: "discarded" }),
  };
}
