import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface AutomationRule {
    id: string;
    client_id: string;
    rule_type: "pause_high_cpa" | "scale_good_performer" | "pause_no_conversion" | "alert_only";
    is_active: boolean;
    condition: Record<string, any>;
    action: Record<string, any>;
    created_at: string;
    updated_at: string;
}

export interface AutomationLog {
    id: string;
    client_id: string;
    rule_id: string | null;
    action: string;
    campaign_name: string | null;
    external_campaign_id: string | null;
    details: Record<string, any>;
    status: "success" | "error" | "skipped";
    error_message: string | null;
    created_at: string;
}

export interface CreateRuleInput {
    client_id: string;
    rule_type: AutomationRule["rule_type"];
    is_active?: boolean;
    condition: Record<string, any>;
    action: Record<string, any>;
}

export interface UpdateRuleInput {
    id: string;
    is_active?: boolean;
    condition?: Record<string, any>;
    action?: Record<string, any>;
}

export function useAutomation(clientId: string | undefined) {
    const queryClient = useQueryClient();

    // Fetch automation rules for this client
    const rulesQuery = useQuery({
        queryKey: ["automation-rules", clientId],
        queryFn: async (): Promise<AutomationRule[]> => {
            if (!clientId) return [];

            const { data, error } = await (supabase
                .from("automation_rules" as any)
                .select("*") as any)
                .eq("client_id", clientId)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return (data as AutomationRule[]) ?? [];
        },
        enabled: !!clientId,
        staleTime: 30_000,
    });

    // Fetch automation logs (last 50)
    const logsQuery = useQuery({
        queryKey: ["automation-logs", clientId],
        queryFn: async (): Promise<AutomationLog[]> => {
            if (!clientId) return [];

            const { data, error } = await (supabase
                .from("automation_log" as any)
                .select("*") as any)
                .eq("client_id", clientId)
                .order("created_at", { ascending: false })
                .limit(50);

            if (error) throw error;
            return (data as AutomationLog[]) ?? [];
        },
        enabled: !!clientId,
        staleTime: 30_000,
    });

    // Create rule
    const createRuleMutation = useMutation({
        mutationFn: async (input: CreateRuleInput) => {
            const { data, error } = await (supabase
                .from("automation_rules" as any)
                .insert({
                    client_id: input.client_id,
                    rule_type: input.rule_type,
                    is_active: input.is_active ?? true,
                    config: input.config,
                }) as any)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success("Regra de automação criada.");
            queryClient.invalidateQueries({ queryKey: ["automation-rules", clientId] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao criar regra.");
        },
    });

    // Update rule
    const updateRuleMutation = useMutation({
        mutationFn: async (input: UpdateRuleInput) => {
            const updatePayload: Record<string, any> = {};
            if (input.is_active !== undefined) updatePayload.is_active = input.is_active;
            if (input.config !== undefined) updatePayload.config = input.config;

            const { data, error } = await (supabase
                .from("automation_rules" as any)
                .update(updatePayload) as any)
                .eq("id", input.id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success("Regra atualizada.");
            queryClient.invalidateQueries({ queryKey: ["automation-rules", clientId] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao atualizar regra.");
        },
    });

    // Delete rule
    const deleteRuleMutation = useMutation({
        mutationFn: async (ruleId: string) => {
            const { error } = await (supabase
                .from("automation_rules" as any)
                .delete() as any)
                .eq("id", ruleId);

            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Regra removida.");
            queryClient.invalidateQueries({ queryKey: ["automation-rules", clientId] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao remover regra.");
        },
    });

    // Trigger manual optimization
    const triggerMutation = useMutation({
        mutationFn: async (targetClientId: string) => {
            const { data, error } = await supabase.functions.invoke("auto-optimize", {
                body: { client_id: targetClientId },
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);
            return data;
        },
        onSuccess: (data) => {
            const total = data.total_actions || 0;
            toast.success(`Otimização concluída: ${total} ações executadas.`);
            queryClient.invalidateQueries({ queryKey: ["automation-logs", clientId] });
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao executar otimização.");
        },
    });

    return {
        rules: rulesQuery.data ?? [],
        logs: logsQuery.data ?? [],
        isLoading: rulesQuery.isLoading || logsQuery.isLoading,
        createRule: (input: CreateRuleInput) => createRuleMutation.mutate(input),
        updateRule: (input: UpdateRuleInput) => updateRuleMutation.mutate(input),
        deleteRule: (ruleId: string) => deleteRuleMutation.mutate(ruleId),
        triggerOptimize: (targetClientId: string) => triggerMutation.mutate(targetClientId),
        isOptimizing: triggerMutation.isPending,
        isCreating: createRuleMutation.isPending,
        isUpdating: updateRuleMutation.isPending,
        isDeleting: deleteRuleMutation.isPending,
    };
}
