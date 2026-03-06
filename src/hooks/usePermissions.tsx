import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type MetricKey, METRIC_DEFINITIONS } from "@/lib/types";

interface PermissionsContextType {
  loading: boolean;
  getVisibleMetrics: (clientId: string) => MetricKey[];
  togglePermission: (clientId: string, metricKey: MetricKey) => void;
  setAllPermissions: (clientId: string, visible: boolean) => void;
  isMetricVisible: (clientId: string, metricKey: MetricKey) => boolean;
  savePermissions: (clientId: string) => Promise<void>;
  loadPermissionsForClient: (clientId: string) => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

// Local state: clientId -> metricKey -> isVisible
type VisibilityMap = Record<string, Record<string, boolean>>;

async function fetchPermissions(clientId: string): Promise<Record<string, boolean>> {
  const { data, error } = await supabase
    .from("client_metric_visibility")
    .select("metric_key, is_visible")
    .eq("client_user_id", clientId);

  if (error) throw error;

  const map: Record<string, boolean> = {};
  METRIC_DEFINITIONS.forEach((m) => { map[m.key] = true; });
  data?.forEach((row) => { map[row.metric_key] = row.is_visible; });
  return map;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [visibility, setVisibility] = useState<VisibilityMap>({});
  const [loading, setLoading] = useState(false);

  const loadPermissionsForClient = useCallback(async (clientId: string) => {
    if (!clientId) return;
    setLoading(true);
    try {
      // Use queryClient.fetchQuery for caching
      const map = await queryClient.fetchQuery({
        queryKey: ["permissions", clientId],
        queryFn: () => fetchPermissions(clientId),
        staleTime: 5 * 60 * 1000,
      });
      setVisibility((prev) => ({ ...prev, [clientId]: map }));
    } catch (error) {
      console.error("Error loading permissions:", error);
    } finally {
      setLoading(false);
    }
  }, [queryClient]);

  const isMetricVisible = useCallback(
    (clientId: string, metricKey: MetricKey) => {
      return visibility[clientId]?.[metricKey] ?? true;
    },
    [visibility]
  );

  const getVisibleMetrics = useCallback(
    (clientId: string) => {
      return METRIC_DEFINITIONS
        .filter((m) => isMetricVisible(clientId, m.key))
        .map((m) => m.key);
    },
    [isMetricVisible]
  );

  const togglePermission = useCallback((clientId: string, metricKey: MetricKey) => {
    setVisibility((prev) => ({
      ...prev,
      [clientId]: {
        ...prev[clientId],
        [metricKey]: !(prev[clientId]?.[metricKey] ?? true),
      },
    }));
  }, []);

  const setAllPermissions = useCallback((clientId: string, visible: boolean) => {
    setVisibility((prev) => {
      const map: Record<string, boolean> = {};
      METRIC_DEFINITIONS.forEach((m) => { map[m.key] = visible; });
      return { ...prev, [clientId]: map };
    });
  }, []);

  const savePermissions = useCallback(async (clientId: string) => {
    const clientMap = visibility[clientId];
    if (!clientMap) return;

    const rows = Object.entries(clientMap).map(([metric_key, is_visible]) => ({
      client_user_id: clientId,
      metric_key,
      is_visible,
    }));

    const { error } = await supabase
      .from("client_metric_visibility")
      .upsert(rows, { onConflict: "client_user_id,metric_key" });

    if (error) {
      console.error("Error saving permissions:", error);
      throw error;
    }

    // Invalidate cache so next load gets fresh data
    queryClient.invalidateQueries({ queryKey: ["permissions", clientId] });
  }, [visibility, queryClient]);

  return (
    <PermissionsContext.Provider value={{ loading, getVisibleMetrics, togglePermission, setAllPermissions, isMetricVisible, savePermissions, loadPermissionsForClient }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}
