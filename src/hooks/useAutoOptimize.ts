import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AutoOptimizeStep {
  order: number;
  description: string;
  action_type: string;
  platform: string;
  params?: Record<string, any>;
  campaign_name?: string;
  reversible?: boolean;
  justification?: string;
}

export interface AutoOptimizePlan {
  summary: string;
  risk_level: "baixo" | "medio" | "alto";
  expected_impact: string;
  steps: AutoOptimizeStep[];
  warnings?: string[];
  total_executable: number;
  total_manual: number;
}

export interface AutoOptimizeStepResult {
  step: number;
  success: boolean;
  message: string;
}

export interface Recommendation {
  type: "alert" | "opportunity" | "optimization";
  titulo: string;
  descricao?: string;
  acao?: string;
  campanha?: string | null;
  prioridade?: string;
  impacto_estimado?: string;
  potencial?: string;
  external_campaign_id?: string | null;
  platform?: string | null;
}

export function useAutoOptimize(clientId: string) {
  const [plan, setPlan] = useState<AutoOptimizePlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<AutoOptimizeStepResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateAutoPlan = useCallback(
    async (recommendations: Recommendation[]) => {
      setIsPlanning(true);
      setError(null);
      setPlan(null);
      setResults(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "claude-optimize",
          {
            body: {
              action: "auto_plan",
              client_id: clientId,
              recommendations,
            },
          }
        );

        if (fnError) throw new Error(fnError.message);
        if (data?.error) {
          setError(data.error);
          toast.error(data.error);
          return null;
        }

        setPlan(data.plan);
        return data.plan as AutoOptimizePlan;
      } catch (e: any) {
        const msg = e.message || "Erro ao gerar plano de otimização automática";
        setError(msg);
        toast.error(msg);
        return null;
      } finally {
        setIsPlanning(false);
      }
    },
    [clientId]
  );

  const executeAutoPlan = useCallback(
    async (steps: AutoOptimizeStep[]) => {
      setIsExecuting(true);
      setError(null);
      setResults(null);

      try {
        const executableSteps = steps.filter(
          (s) => s.action_type !== "manual_recommendation"
        );

        if (executableSteps.length === 0) {
          toast.info(
            "Todas as ações são recomendações manuais. Nenhuma execução automática."
          );
          setResults(
            steps.map((s) => ({
              step: s.order,
              success: true,
              message: "Recomendação manual",
            }))
          );
          return;
        }

        const { data, error: fnError } = await supabase.functions.invoke(
          "claude-optimize",
          {
            body: {
              action: "execute",
              client_id: clientId,
              steps: executableSteps,
            },
          }
        );

        if (fnError) throw new Error(fnError.message);
        if (data?.error) {
          setError(data.error);
          toast.error(data.error);
          return;
        }

        setResults(data.results);
        const successCount = (data.results as AutoOptimizeStepResult[]).filter(
          (r) => r.success
        ).length;
        const failCount = (data.results as AutoOptimizeStepResult[]).filter(
          (r) => !r.success
        ).length;

        if (failCount === 0) {
          toast.success(
            `${successCount} otimização(ões) executada(s) com sucesso!`
          );
        } else if (successCount > 0) {
          toast.warning(
            `${successCount} sucesso(s), ${failCount} falha(s).`
          );
        } else {
          toast.error("Nenhuma otimização executada com sucesso.");
        }
      } catch (e: any) {
        const msg = e.message || "Erro ao executar otimizações";
        setError(msg);
        toast.error(msg);
      } finally {
        setIsExecuting(false);
      }
    },
    [clientId]
  );

  const reset = useCallback(() => {
    setPlan(null);
    setResults(null);
    setError(null);
  }, []);

  return {
    plan,
    isPlanning,
    isExecuting,
    results,
    error,
    generateAutoPlan,
    executeAutoPlan,
    reset,
  };
}
