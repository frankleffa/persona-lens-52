import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { DateRange } from "@/lib/periodUtils";
import { getComparisonPeriods } from "@/lib/periodUtils";

export type ClientStatus = "CRITICAL" | "ATTENTION" | "STABLE" | "GROWING";
export type StrategyType = "Performance" | "Branding" | "Full Funnel" | "Lead Gen" | "E-commerce";
export type Priority = "Alta" | "Média" | "Baixa";
export type Trend = "up" | "down" | "stable";

export interface AgencyClient {
  id: string;
  client_user_id: string;
  name: string;
  strategyType: StrategyType;
  score: number;
  status: ClientStatus;
  priority: Priority;
  trend: Trend;
  recommendation: string;
}

export interface AgencyControlData {
  clients: AgencyClient[];
  totalClients: number;
  statusCounts: Record<ClientStatus, number>;
  averageScore: number;
}

function deriveStatus(score: number): ClientStatus {
  if (score < 40) return "CRITICAL";
  if (score < 60) return "ATTENTION";
  if (score < 80) return "STABLE";
  return "GROWING";
}

function derivePriority(status: ClientStatus): Priority {
  if (status === "CRITICAL") return "Alta";
  if (status === "ATTENTION") return "Média";
  return "Baixa";
}

function deriveTrend(currentSpend: number, previousSpend: number): Trend {
  if (previousSpend === 0) return "stable";
  const change = ((currentSpend - previousSpend) / previousSpend) * 100;
  if (change > 5) return "up";
  if (change < -5) return "down";
  return "stable";
}

function deriveRecommendation(status: ClientStatus, trend: Trend): string {
  if (status === "CRITICAL" && trend === "down") return "Ação urgente: revisar campanhas e orçamento imediatamente";
  if (status === "CRITICAL") return "Revisar estratégia de campanhas e otimizar segmentação";
  if (status === "ATTENTION" && trend === "down") return "Monitorar queda de performance e ajustar lances";
  if (status === "ATTENTION") return "Otimizar criativos e testar novas audiências";
  if (status === "GROWING") return "Escalar investimento e expandir campanhas de sucesso";
  return "Manter estratégia atual e monitorar resultados";
}

const STRATEGY_TYPES: StrategyType[] = ["Performance", "Branding", "Full Funnel", "Lead Gen", "E-commerce"];

export function useAgencyControl(selectedRange: DateRange) {
  const [data, setData] = useState<AgencyControlData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-clients`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "list" }),
        }
      );
      const result = await res.json();
      if (result.error) throw new Error(result.error);

      const clientLinks = result.clients || [];
      const periods = getComparisonPeriods(selectedRange);

      // Fetch metrics for scoring
      const { data: currentMetrics } = await supabase
        .from("daily_metrics")
        .select("client_id, spend, clicks, conversions, impressions, roas")
        .gte("date", periods.current.start)
        .lte("date", periods.current.end);

      const { data: previousMetrics } = await supabase
        .from("daily_metrics")
        .select("client_id, spend, clicks, conversions")
        .gte("date", periods.previous.start)
        .lte("date", periods.previous.end);

      // Aggregate by client
      const currentByClient: Record<string, { spend: number; clicks: number; conversions: number; impressions: number; roas: number }> = {};
      const previousByClient: Record<string, { spend: number }> = {};

      (currentMetrics || []).forEach((m) => {
        if (!currentByClient[m.client_id]) currentByClient[m.client_id] = { spend: 0, clicks: 0, conversions: 0, impressions: 0, roas: 0 };
        currentByClient[m.client_id].spend += m.spend || 0;
        currentByClient[m.client_id].clicks += m.clicks || 0;
        currentByClient[m.client_id].conversions += m.conversions || 0;
        currentByClient[m.client_id].impressions += m.impressions || 0;
        currentByClient[m.client_id].roas += m.roas || 0;
      });

      (previousMetrics || []).forEach((m) => {
        if (!previousByClient[m.client_id]) previousByClient[m.client_id] = { spend: 0 };
        previousByClient[m.client_id].spend += m.spend || 0;
      });

      const clients: AgencyClient[] = clientLinks.map((link: any, i: number) => {
        const cur = currentByClient[link.client_user_id] || { spend: 0, clicks: 0, conversions: 0, impressions: 0, roas: 0 };
        const prev = previousByClient[link.client_user_id] || { spend: 0 };

        // Score: combination of activity, conversions, and efficiency
        const hasActivity = cur.spend > 0 || cur.clicks > 0;
        const conversionRate = cur.clicks > 0 ? (cur.conversions / cur.clicks) * 100 : 0;
        const activityScore = hasActivity ? 40 : 10;
        const conversionScore = Math.min(conversionRate * 10, 30);
        const efficiencyScore = cur.roas > 0 ? Math.min(cur.roas * 5, 30) : (cur.conversions > 0 ? 15 : 0);
        const score = Math.round(Math.min(activityScore + conversionScore + efficiencyScore, 100));

        const status = deriveStatus(score);
        const trend = deriveTrend(cur.spend, prev.spend);
        const priority = derivePriority(status);
        const recommendation = deriveRecommendation(status, trend);

        return {
          id: link.id,
          client_user_id: link.client_user_id,
          name: link.client_label || link.full_name || link.email || "Cliente",
          strategyType: STRATEGY_TYPES[i % STRATEGY_TYPES.length],
          score,
          status,
          priority,
          trend,
          recommendation,
        };
      });

      const statusCounts: Record<ClientStatus, number> = { CRITICAL: 0, ATTENTION: 0, STABLE: 0, GROWING: 0 };
      clients.forEach((c) => { statusCounts[c.status]++; });

      const averageScore = clients.length > 0
        ? Math.round(clients.reduce((sum, c) => sum + c.score, 0) / clients.length)
        : 0;

      setData({
        clients,
        totalClients: clients.length,
        statusCounts,
        averageScore,
      });
    } catch (err: any) {
      console.error("useAgencyControl error:", err);
      setError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error };
}
