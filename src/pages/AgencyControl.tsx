import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Loader2, ShieldAlert, TrendingUp, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAgencyControl } from "@/hooks/useAgencyControl";
import type { PresetRange } from "@/lib/periodUtils";

const DATE_OPTIONS: Array<{ value: PresetRange; label: string }> = [
  { value: "LAST_7_DAYS", label: "7 dias" },
  { value: "LAST_14_DAYS", label: "14 dias" },
  { value: "LAST_30_DAYS", label: "30 dias" },
];

function getStatusBadgeClass(status: "CRITICAL" | "ATTENTION" | "STABLE" | "GROWING") {
  switch (status) {
    case "CRITICAL":
      return "bg-destructive text-destructive-foreground";
    case "ATTENTION":
      return "bg-yellow-500 text-black";
    case "STABLE":
      return "bg-blue-500 text-white";
    case "GROWING":
      return "bg-green-600 text-white";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}


function getTrendPercentage(metricsCurrent: any, metricsPrevious: any): number {
  const current = Number(metricsCurrent?.conversions) || 0;
  const previous = Number(metricsPrevious?.conversions) || 0;

  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export default function AgencyControl() {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState<PresetRange>("LAST_30_DAYS");
  const { data, loading, error } = useAgencyControl(selectedRange);

  const summary = useMemo(() => {
    const totalClients = data.length;
    const totalCritical = data.filter((client) => client.status === "CRITICAL").length;
    const totalAttention = data.filter((client) => client.status === "ATTENTION").length;
    const averageScore = totalClients === 0
      ? 0
      : data.reduce((sum, client) => sum + client.score, 0) / totalClients;

    return {
      totalClients,
      totalCritical,
      totalAttention,
      averageScore,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Agency Control Center</h1>
            <p className="text-sm text-muted-foreground">Visão executiva da saúde da carteira de clientes</p>
          </div>

          <div className="inline-flex rounded-xl border bg-card p-1">
            {DATE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedRange(option.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                  selectedRange === option.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card-executive p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Waves className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Total clientes</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{summary.totalClients}</p>
          </div>

          <div className="card-executive p-4">
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Critical</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{summary.totalCritical}</p>
          </div>

          <div className="card-executive p-4">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Attention</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{summary.totalAttention}</p>
          </div>

          <div className="card-executive p-4">
            <div className="flex items-center gap-2 text-primary">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs uppercase tracking-wider">Score médio</span>
            </div>
            <p className="mt-2 text-2xl font-semibold">{summary.averageScore.toFixed(1)}</p>
          </div>
        </div>

        <div className="card-executive overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="px-6 py-8 text-sm text-destructive">{error}</div>
          ) : data.length === 0 ? (
            <div className="px-6 py-8 text-sm text-muted-foreground">Nenhum cliente encontrado para o período selecionado.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Cliente</th>
                    <th className="px-4 py-3 text-left">Strategy Type</th>
                    <th className="px-4 py-3 text-left">Score</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Prioridade</th>
                    <th className="px-4 py-3 text-left">Tendência</th>
                    <th className="px-4 py-3 text-left">Ação recomendada</th>
                    <th className="px-4 py-3 text-left">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((client) => (
                    <tr key={client.clientId} className="border-t border-border/60">
                      <td className="px-4 py-3 font-medium text-foreground">{client.clientName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{client.strategyType}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">{client.score.toFixed(1)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusBadgeClass(client.status)}>{client.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{client.priority}</td>
                      <td className="px-4 py-3 text-muted-foreground">{getTrendPercentage(client.metricsCurrent, client.metricsPrevious).toFixed(1)}%</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-[320px] truncate" title={client.recommendation}>
                        {client.recommendation}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/preview?client=${client.clientId}`)} className="gap-1.5">
                          Ver Cliente
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
