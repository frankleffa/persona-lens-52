import { useEffect, useState } from "react";
import { useClientAnalysisConfig } from "@/hooks/useClientAnalysisConfig";
import {
  VERTICAL_LABELS,
  VERTICAL_METRICS,
  type ClientVertical,
  type PrimaryMetric,
} from "@/types/analysis";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Settings2 } from "lucide-react";

interface ClientAnalysisConfigProps {
  clientId: string;
}

const ALL_VERTICALS = Object.keys(VERTICAL_LABELS) as ClientVertical[];

const PRIMARY_METRIC_LABELS: Record<PrimaryMetric, string> = {
  purchases: "Compras",
  ftd: "FTDs (First Time Deposit)",
  leads: "Leads",
  registrations: "Registros / Cadastros",
  messages: "Mensagens",
  revenue: "Receita",
};

export function ClientAnalysisConfig({ clientId }: ClientAnalysisConfigProps) {
  const { config, isLoading, saveConfig, isSaving } =
    useClientAnalysisConfig(clientId);

  const [vertical, setVertical] = useState<ClientVertical>("ecommerce");
  const [primaryMetric, setPrimaryMetric] = useState<PrimaryMetric>("purchases");
  const [metricLabel, setMetricLabel] = useState("Compras");
  const [cpaTarget, setCpaTarget] = useState("");
  const [roasTarget, setRoasTarget] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [notes, setNotes] = useState("");

  // Populate form when config loads
  useEffect(() => {
    if (config) {
      setVertical(config.vertical as ClientVertical);
      setPrimaryMetric(config.primary_metric as PrimaryMetric);
      setMetricLabel(config.primary_metric_label);
      setCpaTarget(config.cpa_target != null ? String(config.cpa_target) : "");
      setRoasTarget(config.roas_target != null ? String(config.roas_target) : "");
      setMonthlyBudget(
        config.monthly_budget != null ? String(config.monthly_budget) : ""
      );
      setNotes(config.notes || "");
    }
  }, [config]);

  // When vertical changes, update metric options and defaults
  const handleVerticalChange = (v: string) => {
    const newVertical = v as ClientVertical;
    setVertical(newVertical);

    const verticalConfig = VERTICAL_METRICS[newVertical];
    // If current metric isn't valid for new vertical, reset to default
    if (!verticalConfig.metrics.includes(primaryMetric)) {
      setPrimaryMetric(verticalConfig.default_metric);
      setMetricLabel(verticalConfig.default_label);
    }
  };

  const handleMetricChange = (m: string) => {
    const newMetric = m as PrimaryMetric;
    setPrimaryMetric(newMetric);
    // Auto-fill label based on metric selection
    setMetricLabel(PRIMARY_METRIC_LABELS[newMetric]);
  };

  const handleSave = () => {
    saveConfig({
      vertical,
      primary_metric: primaryMetric,
      primary_metric_label: metricLabel,
      cpa_target: cpaTarget ? parseFloat(cpaTarget) : null,
      roas_target: roasTarget ? parseFloat(roasTarget) : null,
      monthly_budget: monthlyBudget ? parseFloat(monthlyBudget) : null,
      notes: notes || null,
    });
  };

  const availableMetrics = VERTICAL_METRICS[vertical].metrics;

  if (isLoading) {
    return (
      <Card className="border-border bg-surface">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          Perfil de Análise do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Vertical */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Vertical / Nicho
          </Label>
          <Select value={vertical} onValueChange={handleVerticalChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_VERTICALS.map((v) => (
                <SelectItem key={v} value={v}>
                  {VERTICAL_LABELS[v]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Primary Metric */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Métrica Principal
          </Label>
          <Select value={primaryMetric} onValueChange={handleMetricChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMetrics.map((m) => (
                <SelectItem key={m} value={m}>
                  {PRIMARY_METRIC_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Custom Label */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Label da Métrica (como aparece nos relatórios)
          </Label>
          <Input
            value={metricLabel}
            onChange={(e) => setMetricLabel(e.target.value)}
            placeholder="Ex: Vendas, FTDs, Leads Qualificados..."
          />
        </div>

        {/* Targets row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              CPA Alvo (R$)
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={cpaTarget}
              onChange={(e) => setCpaTarget(e.target.value)}
              placeholder="Ex: 50.00"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              ROAS Alvo
            </Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={roasTarget}
              onChange={(e) => setRoasTarget(e.target.value)}
              placeholder="Ex: 3.0"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              Budget Mensal (R$)
            </Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={monthlyBudget}
              onChange={(e) => setMonthlyBudget(e.target.value)}
              placeholder="Ex: 5000.00"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-xs font-medium text-muted-foreground">
            Notas sobre o cliente
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Foco em público 25-40 anos, produto ticket alto, principal concorrente é X..."
            rows={3}
          />
        </div>

        {/* Save */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : config ? (
            "Atualizar Configuração"
          ) : (
            "Salvar Configuração"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
