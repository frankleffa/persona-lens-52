import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActionLog {
  id: string;
  client_id: string;
  manager_id: string;
  action_type: string;
  object_type: string | null;
  external_object_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

function useActionLogs(clientId: string | undefined) {
  return useQuery({
    queryKey: ["campaign-actions-log", clientId],
    queryFn: async (): Promise<ActionLog[]> => {
      if (!clientId) return [];
      const { data, error } = await (supabase
        .from("campaign_actions_log" as any)
        .select("*") as any)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as ActionLog[]) ?? [];
    },
    enabled: !!clientId,
    staleTime: 30_000,
  });
}

const ACTION_BADGES: Record<string, { label: string; color: string }> = {
  created_campaign: { label: "Criado", color: "#4ADE80" },
  created_adset: { label: "Criado", color: "#4ADE80" },
  created_ad: { label: "Criado", color: "#4ADE80" },
  updated_status: { label: "Status", color: "#1c9cf0" },
  updated_budget: { label: "Budget", color: "#a855f7" },
  duplicated_campaign: { label: "Duplicado", color: "#6b7280" },
  paused: { label: "Pausado", color: "#eab308" },
  activated: { label: "Ativado", color: "#1c9cf0" },
  archived: { label: "Arquivado", color: "#ef4444" },
};

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActionBadge(actionType: string, details: Record<string, any> | null) {
  // Resolve specific status changes
  if (actionType === "updated_status" && details?.status === "PAUSED") {
    return ACTION_BADGES.paused;
  }
  if (actionType === "updated_status" && details?.status === "ACTIVE") {
    return ACTION_BADGES.activated;
  }
  if (actionType === "updated_status" && details?.status === "ARCHIVED") {
    return ACTION_BADGES.archived;
  }
  return ACTION_BADGES[actionType] || { label: actionType, color: "#6b7280" };
}

interface CampaignActionsLogProps {
  clientId: string;
}

export function CampaignActionsLog({ clientId }: CampaignActionsLogProps) {
  const { data: logs, isLoading } = useActionLogs(clientId);

  if (isLoading) {
    return (
      <div className="card-executive p-6 animate-fade-in">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5 animate-spin" /> Carregando histórico...
        </div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="card-executive p-6 animate-fade-in">
        <p className="kpi-label mb-4">Histórico de Ações</p>
        <div className="py-8 text-center">
          <Bot className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-sm text-muted-foreground">Nenhuma ação registrada ainda</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-executive p-6 animate-fade-in">
      <p className="kpi-label mb-4">Histórico de Ações</p>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Data/Hora
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Ação
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Tipo
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Campanha/Objeto
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Detalhes
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => {
              const badge = getActionBadge(log.action_type, log.details);
              return (
                <tr key={log.id} className="border-b border-white/3 hover:bg-white/3">
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ background: `${badge.color}15`, color: badge.color }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-foreground capitalize">
                    {log.object_type || "—"}
                  </td>
                  <td className="px-3 py-2 text-foreground font-mono text-[11px] max-w-[180px] truncate">
                    {log.external_object_id || "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                    {log.details
                      ? Object.entries(log.details)
                          .filter(([k]) => !["status"].includes(k))
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${typeof v === "object" ? "..." : v}`)
                          .join(" · ")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
