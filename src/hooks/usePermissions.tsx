import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type MetricKey, type ClientMetricPermission, METRIC_DEFINITIONS, MOCK_CLIENTS } from "@/lib/types";

interface PermissionsContextType {
  permissions: ClientMetricPermission[];
  getVisibleMetrics: (clientId: string) => MetricKey[];
  togglePermission: (clientId: string, metricKey: MetricKey) => void;
  setAllPermissions: (clientId: string, visible: boolean) => void;
  isMetricVisible: (clientId: string, metricKey: MetricKey) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType | null>(null);

function generateDefaultPermissions(): ClientMetricPermission[] {
  const perms: ClientMetricPermission[] = [];
  MOCK_CLIENTS.forEach((client) => {
    METRIC_DEFINITIONS.forEach((metric) => {
      perms.push({
        id: `${client.id}-${metric.key}`,
        clientId: client.id,
        metricKey: metric.key,
        isVisible: true,
      });
    });
  });
  return perms;
}

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<ClientMetricPermission[]>(generateDefaultPermissions);

  const isMetricVisible = useCallback(
    (clientId: string, metricKey: MetricKey) => {
      const perm = permissions.find((p) => p.clientId === clientId && p.metricKey === metricKey);
      return perm?.isVisible ?? true;
    },
    [permissions]
  );

  const getVisibleMetrics = useCallback(
    (clientId: string) => {
      return permissions.filter((p) => p.clientId === clientId && p.isVisible).map((p) => p.metricKey);
    },
    [permissions]
  );

  const togglePermission = useCallback((clientId: string, metricKey: MetricKey) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.clientId === clientId && p.metricKey === metricKey ? { ...p, isVisible: !p.isVisible } : p
      )
    );
  }, []);

  const setAllPermissions = useCallback((clientId: string, visible: boolean) => {
    setPermissions((prev) =>
      prev.map((p) => (p.clientId === clientId ? { ...p, isVisible: visible } : p))
    );
  }, []);

  return (
    <PermissionsContext.Provider value={{ permissions, getVisibleMetrics, togglePermission, setAllPermissions, isMetricVisible }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error("usePermissions must be used within PermissionsProvider");
  return ctx;
}
