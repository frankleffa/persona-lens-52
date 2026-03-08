import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OptimizationCounts {
  todo: number;
  inProgress: number;
  done: number;
}

async function fetchOptimizationCounts(clientIds: string[]): Promise<Record<string, OptimizationCounts>> {
  if (!clientIds.length) return {};

  const { data, error } = await supabase
    .from("optimization_tasks")
    .select("client_id, status")
    .in("client_id", clientIds);

  if (error) throw error;

  const result: Record<string, OptimizationCounts> = {};
  for (const id of clientIds) {
    result[id] = { todo: 0, inProgress: 0, done: 0 };
  }

  for (const row of data ?? []) {
    const entry = result[row.client_id];
    if (!entry) continue;
    if (row.status === "TODO") entry.todo++;
    else if (row.status === "IN_PROGRESS") entry.inProgress++;
    else if (row.status === "DONE") entry.done++;
  }

  return result;
}

export function useOptimizationCounts(clientIds: string[]) {
  const queryClient = useQueryClient();
  const idsKey = clientIds.join(",");

  const { data, isLoading } = useQuery({
    queryKey: ["optimizationCounts", idsKey],
    queryFn: () => fetchOptimizationCounts(clientIds),
    enabled: clientIds.length > 0,
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  return {
    counts: data ?? {},
    loading: isLoading,
    refetchCounts: () => queryClient.invalidateQueries({ queryKey: ["optimizationCounts", idsKey] }),
  };
}
