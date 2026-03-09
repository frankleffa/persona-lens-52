import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ClientAnalysisConfig {
    id?: string;
    client_id: string;
    vertical: string;
    primary_metric: string;
    primary_metric_label: string;
    cpa_target: number | null;
    roas_target: number | null;
    cost_per_ftd_target: number | null;
    monthly_budget: number | null;
    notes: string | null;
    ftd_event_name: string | null;
    ftd_google_conversion_name: string | null;
    created_at?: string;
    updated_at?: string;
}

export type SaveConfigInput = Omit<ClientAnalysisConfig, "id" | "created_at" | "updated_at">;

export interface MetaEvent {
    action_type: string;
    is_custom: boolean;
    is_conversion: boolean;
}

export function useClientAnalysisConfig(clientId: string | undefined) {
    const queryClient = useQueryClient();

    const configQuery = useQuery({
        queryKey: ["client-analysis-config", clientId],
        queryFn: async (): Promise<ClientAnalysisConfig | null> => {
            if (!clientId) return null;
            const { data, error } = await (supabase
                .from("client_analysis_config" as any)
                .select("*") as any)
                .eq("client_id", clientId)
                .maybeSingle();
            if (error) {
                console.error("Error fetching analysis config:", error);
                return null;
            }
            return data as ClientAnalysisConfig | null;
        },
        enabled: !!clientId,
        staleTime: 60_000,
    });

    const saveMutation = useMutation({
        mutationFn: async (input: SaveConfigInput) => {
            const { data, error } = await (supabase
                .from("client_analysis_config" as any)
                .upsert(
                    {
                        client_id: input.client_id,
                        vertical: input.vertical,
                        primary_metric: input.primary_metric,
                        primary_metric_label: input.primary_metric_label,
                        cpa_target: input.cpa_target,
                        roas_target: input.roas_target,
                        cost_per_ftd_target: input.cost_per_ftd_target,
                        monthly_budget: input.monthly_budget,
                        notes: input.notes,
                        ftd_event_name: input.ftd_event_name,
                        ftd_google_conversion_name: input.ftd_google_conversion_name,
                    },
                    { onConflict: "client_id" }
                ) as any)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success("Configuração de análise salva.");
            queryClient.invalidateQueries({ queryKey: ["client-analysis-config", clientId] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao salvar configuração.");
        },
    });

    return {
        config: configQuery.data ?? null,
        isLoading: configQuery.isLoading,
        saveConfig: (input: SaveConfigInput) => saveMutation.mutate(input),
        isSaving: saveMutation.isPending,
    };
}

/** Separate hook for event discovery — only used by ClientAnalysisConfig component */
export function useMetaEventDiscovery(clientId: string | undefined) {
    const eventsQuery = useQuery<MetaEvent[]>({
        queryKey: ["meta-events-discovery", clientId],
        queryFn: async () => {
            const { data, error } = await supabase.functions.invoke("fetch-ads-data", {
                body: { action: "list_custom_events", client_id: clientId },
            });
            if (error) throw error;
            return data?.events || [];
        },
        enabled: false, // manual trigger only
    });

    const fetchAvailableEvents = async () => {
        const result = await eventsQuery.refetch();
        if (result.error) {
            toast.error("Erro ao buscar eventos: " + (result.error.message || "Tente novamente"));
        } else if (!result.data?.length) {
            toast.info("Nenhum evento encontrado nos últimos 30 dias.");
        }
    };

    return {
        fetchAvailableEvents,
        isLoadingEvents: eventsQuery.isFetching,
        availableEvents: eventsQuery.data || [],
    };
}
