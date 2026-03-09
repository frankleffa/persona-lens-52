import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OptimizationStep {
  order: number;
  description: string;
  action_type: string;
  platform: string;
  params?: Record<string, any>;
  campaign_name?: string;
  reversible?: boolean;
}

export interface ExecutionPlan {
  summary: string;
  risk_level: "baixo" | "medio" | "alto";
  expected_impact: string;
  steps: OptimizationStep[];
  warnings?: string[];
}

export interface StepResult {
  step: number;
  success: boolean;
  message: string;
}

export interface OptimizationInput {
  titulo: string;
  descricao?: string;
  acao?: string;
  campanha?: string | null;
  prioridade?: string;
  context_type?: "alert" | "opportunity" | "optimization" | "funnel_action";
}

export function useAIOptimization(clientId: string) {
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<StepResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (optimization: OptimizationInput) => {
    setIsPlanning(true);
    setError(null);
    setPlan(null);
    setResults(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-optimize", {
        body: {
          action: "plan",
          client_id: clientId,
          optimization,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) {
        setError(data.error);
        toast.error(data.error);
        return null;
      }

      setPlan(data.plan);
      return data.plan as ExecutionPlan;
    } catch (e: any) {
      const msg = e.message || "Erro ao gerar plano";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsPlanning(false);
    }
  }, [clientId]);

  const executePlan = useCallback(async (steps: OptimizationStep[]) => {
    setIsExecuting(true);
    setError(null);
    setResults(null);

    try {
      const executableSteps = steps.filter(s => s.action_type !== "manual_recommendation");
      if (executableSteps.length === 0) {
        toast.info("Todas as ações são recomendações manuais. Nenhuma execução automática necessária.");
        setResults(steps.map(s => ({ step: s.order, success: true, message: "Recomendação manual" })));
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("ai-optimize", {
        body: {
          action: "execute",
          client_id: clientId,
          steps: executableSteps,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) {
        setError(data.error);
        toast.error(data.error);
        return;
      }

      setResults(data.results);
      const successCount = (data.results as StepResult[]).filter(r => r.success).length;
      const failCount = (data.results as StepResult[]).filter(r => !r.success).length;

      if (failCount === 0) {
        toast.success(`✅ ${successCount} ação(ões) executada(s) com sucesso!`);
      } else if (successCount > 0) {
        toast.warning(`⚠️ ${successCount} sucesso(s), ${failCount} falha(s).`);
      } else {
        toast.error(`❌ Nenhuma ação executada com sucesso.`);
      }
    } catch (e: any) {
      const msg = e.message || "Erro ao executar";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsExecuting(false);
    }
  }, [clientId]);

  const reset = useCallback(() => {
    setPlan(null);
    setResults(null);
    setError(null);
  }, []);

  return { plan, isPlanning, isExecuting, results, error, generatePlan, executePlan, reset };
}
