import { useState, useMemo } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { METRIC_DEFINITIONS, MOCK_CLIENTS, type MetricKey } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Eye, Save, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PermissionsPage() {
  const [selectedClient, setSelectedClient] = useState(MOCK_CLIENTS[0].id);
  const { isMetricVisible, togglePermission, setAllPermissions } = usePermissions();
  const navigate = useNavigate();

  const groupedMetrics = useMemo(() => {
    const groups: Record<string, typeof METRIC_DEFINITIONS> = {};
    METRIC_DEFINITIONS.forEach((m) => {
      if (!groups[m.module]) groups[m.module] = [];
      groups[m.module].push(m);
    });
    return groups;
  }, []);

  const client = MOCK_CLIENTS.find((c) => c.id === selectedClient)!;

  const visibleCount = METRIC_DEFINITIONS.filter((m) => isMetricVisible(selectedClient, m.key)).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="ml-64 p-8">
        <div className="mb-8 flex items-center justify-between animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Permissões do Cliente</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure quais métricas cada cliente pode visualizar
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => navigate(`/preview?client=${selectedClient}`)}
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              Pré-visualizar
            </Button>
            <Button
              onClick={() => toast.success("Permissões salvas com sucesso!")}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Salvar
            </Button>
          </div>
        </div>

        {/* Client selector */}
        <div className="mb-8 flex gap-3 animate-slide-up">
          {MOCK_CLIENTS.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedClient(c.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                selectedClient === c.id
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {c.avatarInitials}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-foreground">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.company}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Quick actions */}
        <div className="mb-6 flex items-center gap-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{visibleCount}/{METRIC_DEFINITIONS.length} métricas ativas</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setAllPermissions(selectedClient, true)}>
            Ativar Todas
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setAllPermissions(selectedClient, false)}>
            Desativar Todas
          </Button>
        </div>

        {/* Metric groups */}
        <div className="space-y-6">
          {Object.entries(groupedMetrics).map(([module, metrics], gi) => (
            <div
              key={module}
              className="card-executive p-6 animate-slide-up"
              style={{ animationDelay: `${150 + gi * 80}ms` }}
            >
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {module}
              </h3>
              <div className="space-y-3">
                {metrics.map((m) => (
                  <div
                    key={m.key}
                    className="flex items-center justify-between rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.description}</p>
                    </div>
                    <Switch
                      checked={isMetricVisible(selectedClient, m.key)}
                      onCheckedChange={() => togglePermission(selectedClient, m.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
