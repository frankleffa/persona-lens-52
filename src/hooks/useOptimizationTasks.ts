import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export type OptimizationStatus = "TODO" | "IN_PROGRESS" | "DONE";

export interface OptimizationTask {
  id: string;
  client_id: string;
  title: string;
  description?: string | null;
  status: OptimizationStatus;
  auto_generated: boolean;
  created_at: string;
  completed_at?: string | null;
}

const STATUS_PRIORITY: Record<OptimizationStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  DONE: 2,
};

export function useOptimizationTasks(clientId: string) {
  const [tasks, setTasks] = useState<OptimizationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("optimization_tasks")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setTasks([]);
    } else {
      const sorted = ((data as OptimizationTask[]) ?? []).sort((a, b) => {
        const sa = STATUS_PRIORITY[a.status] ?? 9;
        const sb = STATUS_PRIORITY[b.status] ?? 9;
        if (sa !== sb) return sa - sb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setTasks(sorted);
    }

    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(
    async (title: string, description?: string) => {
      const { error: insertError } = await supabase
        .from("optimization_tasks")
        .insert({
          client_id: clientId,
          title,
          description: description ?? null,
          status: "TODO",
          auto_generated: false,
        });

      if (insertError) {
        setError(insertError.message);
        return;
      }
      await fetchTasks();
    },
    [clientId, fetchTasks]
  );

  const updateTaskStatus = useCallback(
    async (taskId: string, newStatus: OptimizationStatus) => {
      const updatePayload: { status: string; completed_at: string | null } = {
        status: newStatus,
        completed_at: newStatus === "DONE" ? new Date().toISOString() : null,
      };

      const { error: updateError } = await supabase
        .from("optimization_tasks")
        .update(updatePayload)
        .eq("id", taskId);

      if (updateError) {
        setError(updateError.message);
        return;
      }
      await fetchTasks();
    },
    [fetchTasks]
  );

  return { tasks, loading, error, createTask, updateTaskStatus };
}
