import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AdsDataResult } from "@/hooks/useAdsData";

export interface AIAction {
  id: string;
  platform: "google_ads" | "meta_ads";
  type: "pause_campaign" | "enable_campaign" | "adjust_budget";
  campaign_id: string;
  campaign_name: string;
  description: string;
  impact: string;
  value?: number;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AIAction[];
  executionResults?: Array<{ action_id: string; success: boolean; message: string }>;
}

export function useAIOptimizer() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);

  const sendMessage = useCallback(async (userMessage: string, campaignData: AdsDataResult | null) => {
    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: userMessage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-optimize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "analyze",
            campaign_data: campaignData,
            user_message: userMessage,
            conversation_history: conversationHistory,
          }),
        }
      );

      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const assistantMsg: AIMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: result.analysis || "Não foi possível gerar uma análise.",
        actions: result.actions || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg: AIMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `Erro: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages]);

  const executeActions = useCallback(async (actions: AIAction[]) => {
    setExecuting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-optimize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "execute",
            actions_to_execute: actions,
          }),
        }
      );

      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      const executionResults = result.results || [];

      // Add execution results as a new assistant message
      const successCount = executionResults.filter((r: { success: boolean }) => r.success).length;
      const failCount = executionResults.length - successCount;

      let summary = `Execução concluída: ${successCount} ação(ões) executada(s) com sucesso`;
      if (failCount > 0) summary += `, ${failCount} falha(s)`;
      summary += ".\n\n";
      for (const r of executionResults) {
        const icon = r.success ? "+" : "x";
        summary += `[${icon}] ${r.message}\n`;
      }

      const resultMsg: AIMessage = {
        id: `result_${Date.now()}`,
        role: "assistant",
        content: summary,
        executionResults,
      };

      setMessages((prev) => [...prev, resultMsg]);
      return executionResults;
    } catch (err) {
      const errorMsg: AIMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content: `Erro ao executar ações: ${err instanceof Error ? err.message : "Erro desconhecido"}`,
      };
      setMessages((prev) => [...prev, errorMsg]);
      return [];
    } finally {
      setExecuting(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    loading,
    executing,
    sendMessage,
    executeActions,
    clearMessages,
  };
}
