import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface OptimizationCounts {
  todo: number;
  inProgress: number;
  done: number;
}

export function useOptimizationCounts(clientIds: string[]) {
  const [counts, setCounts] = useState<Record<string, OptimizationCounts>>({});
  const [loading, setLoading] = useState(false);

  const fetchCounts = useCallback(async () => {
    if (!clientIds.length) {
      setCounts({});
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from("optimization_tasks")
      .select("client_id, status")
      .in("client_id", clientIds);

    if (error) {
      console.error("Failed to fetch optimization counts:", error.message);
      setLoading(false);
      return;
    }

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

    setCounts(result);
    setLoading(false);
  }, [clientIds.join(",")]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return { counts, loading, refetchCounts: fetchCounts };
}
