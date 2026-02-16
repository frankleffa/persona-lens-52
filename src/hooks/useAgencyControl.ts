import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { calculateClientHealth, type MetricsSnapshot, type StrategyType } from "@/lib/decisionEngine";
import { getComparisonPeriods, type DateRange } from "@/lib/periodUtils";

export interface AgencyClientHealth {
  clientId: string;
  clientName: string;
  strategyType: string;
  status: "CRITICAL" | "ATTENTION" | "STABLE" | "GROWING";
  score: number;
  priority: number;
  recommendation: string;
  metricsCurrent: any;
  metricsPrevious: any;
}

interface UseAgencyControlResult {
  data: AgencyClientHealth[];
  loading: boolean;
  error: string | null;
}

interface ManagerClientRow {
  client_user_id: string;
  client_label: string;
  strategy_type: StrategyType | null;
}

interface DailyMetricRow {
  spend: number | null;
  revenue: number | null;
  conversions: number | null;
}

function aggregateMetrics(rows: DailyMetricRow[]): MetricsSnapshot {
  const spend = rows.reduce((sum, row) => sum + (Number(row.spend) || 0), 0);
  const revenue = rows.reduce((sum, row) => sum + (Number(row.revenue) || 0), 0);
  const conversions = rows.reduce((sum, row) => sum + (Number(row.conversions) || 0), 0);

  return {
    spend,
    revenue,
    conversions,
    roas: spend > 0 ? revenue / spend : 0,
    cpa: conversions > 0 ? spend / conversions : 0,
  };
}

async function fetchMetricsByPeriod(clientId: string, start: string, end: string): Promise<MetricsSnapshot> {
  const { data, error } = await supabase
    .from("daily_metrics")
    .select("spend, revenue, conversions")
    .eq("client_id", clientId)
    .gte("date", start)
    .lte("date", end);

  if (error) {
    throw new Error(error.message);
  }

  return aggregateMetrics((data ?? []) as DailyMetricRow[]);
}

export function useAgencyControl(selectedRange: DateRange): UseAgencyControlResult {
  const { user } = useAuth();
  const [data, setData] = useState<AgencyClientHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (!user?.id) {
        if (!mounted) return;
        setData([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Reuse existing manager-client source from client_manager_links.
        const { data: clients, error: clientsError } = await supabase
          .from("client_manager_links")
          .select("client_user_id, client_label, strategy_type")
          .eq("manager_id", user.id)
          .order("client_label", { ascending: true });

        if (clientsError) {
          throw new Error(clientsError.message);
        }

        const periods = getComparisonPeriods(selectedRange);
        const clientRows = (clients ?? []) as ManagerClientRow[];

        const computed = await Promise.all(
          clientRows.map(async (client) => {
            const [metricsCurrent, metricsPrevious] = await Promise.all([
              fetchMetricsByPeriod(client.client_user_id, periods.current.start, periods.current.end),
              fetchMetricsByPeriod(client.client_user_id, periods.previous.start, periods.previous.end),
            ]);

            const strategyType: StrategyType = client.strategy_type ?? "DEMAND";
            const decision = calculateClientHealth(strategyType, metricsCurrent, metricsPrevious);

            return {
              clientId: client.client_user_id,
              clientName: client.client_label,
              strategyType,
              status: decision.status,
              score: decision.score,
              priority: decision.priority,
              recommendation: decision.recommendation,
              metricsCurrent,
              metricsPrevious,
            } satisfies AgencyClientHealth;
          })
        );

        const ordered = [...computed].sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return b.score - a.score;
        });

        if (!mounted) return;
        setData(ordered);
      } catch (e) {
        if (!mounted) return;
        setData([]);
        setError(e instanceof Error ? e.message : "Erro ao carregar agency control");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [selectedRange, user?.id]);

  return { data, loading, error };
}
