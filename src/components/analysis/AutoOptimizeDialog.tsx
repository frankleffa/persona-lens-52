import { useState, useEffect } from "react";
import {
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Zap,
  ArrowRight,
  RotateCcw,
  Info,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useAutoOptimize,
  type Recommendation,
  type AutoOptimizeStep,
} from "@/hooks/useAutoOptimize";

interface AutoOptimizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  recommendations: Recommendation[];
}

const riskConfig = {
  baixo: {
    color: "#22c55e",
    bg: "bg-[#22c55e]/10",
    icon: Shield,
    label: "Risco Baixo",
  },
  medio: {
    color: "#eab308",
    bg: "bg-[#eab308]/10",
    icon: AlertTriangle,
    label: "Risco Medio",
  },
  alto: {
    color: "#ef4444",
    bg: "bg-[#ef4444]/10",
    icon: AlertTriangle,
    label: "Risco Alto",
  },
};

const actionLabels: Record<string, string> = {
  update_status: "Alterar Status",
  update_budget: "Alterar Budget",
  manual_recommendation: "Manual",
};

export function AutoOptimizeDialog({
  open,
  onOpenChange,
  clientId,
  recommendations,
}: AutoOptimizeDialogProps) {
  const {
    plan,
    isPlanning,
    isExecuting,
    results,
    error,
    generateAutoPlan,
    executeAutoPlan,
    reset,
  } = useAutoOptimize(clientId);

  const [selectedSteps, setSelectedSteps] = useState<Set<number>>(new Set());
  const [hasGenerated, setHasGenerated] = useState(false);

  useEffect(() => {
    if (open && recommendations.length > 0 && !hasGenerated) {
      setHasGenerated(true);
      generateAutoPlan(recommendations).then((result) => {
        if (result) {
          const executableIndexes = new Set(
            result.steps
              .filter(
                (s: AutoOptimizeStep) =>
                  s.action_type !== "manual_recommendation"
              )
              .map((_: AutoOptimizeStep, i: number) => i)
          );
          setSelectedSteps(executableIndexes);
        }
      });
    }
  }, [open, recommendations, hasGenerated, generateAutoPlan]);

  const handleClose = () => {
    reset();
    setHasGenerated(false);
    setSelectedSteps(new Set());
    onOpenChange(false);
  };

  const toggleStep = (index: number) => {
    setSelectedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleExecute = async () => {
    if (!plan) return;
    const stepsToExecute = plan.steps.filter((_, i) => selectedSteps.has(i));
    if (stepsToExecute.length === 0) return;
    await executeAutoPlan(stepsToExecute);
  };

  const executableCount =
    plan?.steps.filter((s) => s.action_type !== "manual_recommendation")
      .length || 0;
  const selectedCount = selectedSteps.size;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-[var(--accent)]" />
            Otimizacao Automatica com Claude
          </DialogTitle>
          <DialogDescription className="text-xs">
            Claude analisou {recommendations.length} recomendacao(oes) e gerou
            acoes executaveis
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Loading */}
          {isPlanning && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
              <p className="text-sm text-muted-foreground">
                Claude esta gerando o plano de otimizacao...
              </p>
              <p className="text-[10px] text-muted-foreground">
                Analisando {recommendations.length} recomendacao(oes) e
                transformando em acoes executaveis
              </p>
            </div>
          )}

          {/* Error */}
          {error && !isPlanning && (
            <div className="rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5 p-4 text-sm text-[#ef4444]">
              {error}
            </div>
          )}

          {/* Plan ready */}
          {plan && !isPlanning && (
            <>
              {/* Summary */}
              <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                  <span className="text-xs font-semibold text-[var(--accent)]">
                    Plano gerado por Claude
                  </span>
                </div>
                <p className="text-sm text-foreground">{plan.summary}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {(() => {
                    const rc = riskConfig[plan.risk_level] || riskConfig.medio;
                    const RiskIcon = rc.icon;
                    return (
                      <span
                        className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold ${rc.bg}`}
                        style={{ color: rc.color }}
                      >
                        <RiskIcon className="h-3 w-3" />
                        {rc.label}
                      </span>
                    );
                  })()}
                  <span className="inline-flex items-center gap-1 rounded bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--accent)]">
                    <Zap className="h-3 w-3" />
                    {plan.expected_impact}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {plan.total_executable} executavel(is) | {plan.total_manual}{" "}
                    manual(is)
                  </span>
                </div>
              </div>

              {/* Warnings */}
              {plan.warnings && plan.warnings.length > 0 && (
                <div className="rounded-lg border border-[#eab308]/20 bg-[#eab308]/5 p-3 space-y-1">
                  <p className="text-[10px] font-semibold text-[#eab308] flex items-center gap-1">
                    <Info className="h-3 w-3" /> Avisos importantes
                  </p>
                  {plan.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-[#eab308]/80">
                      {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Steps */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Acoes ({plan.steps.length})
                </p>
                {plan.steps.map((step, i) => {
                  const isManual =
                    step.action_type === "manual_recommendation";
                  const stepResult = results?.find(
                    (r) => r.step === step.order
                  );
                  const isSelected = selectedSteps.has(i);

                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-3 transition-colors ${
                        stepResult
                          ? stepResult.success
                            ? "border-[#22c55e]/30 bg-[#22c55e]/5"
                            : "border-[#ef4444]/30 bg-[#ef4444]/5"
                          : isSelected
                          ? "border-[var(--accent)]/30 bg-[var(--accent)]/5"
                          : "border-white/5 bg-[var(--surface)]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {!results && !isManual && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleStep(i)}
                            className="mt-0.5"
                          />
                        )}
                        {stepResult &&
                          (stepResult.success ? (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 text-[#22c55e] shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 mt-0.5 text-[#ef4444] shrink-0" />
                          ))}
                        {isManual && !results && (
                          <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-foreground">
                              {step.order}. {step.description}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {actionLabels[step.action_type] ||
                                step.action_type}
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              {step.platform}
                            </Badge>
                            {step.campaign_name && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {step.campaign_name}
                              </span>
                            )}
                            {step.reversible === false && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0"
                              >
                                irreversivel
                              </Badge>
                            )}
                          </div>
                          {step.justification && !stepResult && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {step.justification}
                            </p>
                          )}
                          {stepResult && !stepResult.success && (
                            <p className="text-[10px] text-[#ef4444]">
                              {stepResult.message}
                            </p>
                          )}
                          {stepResult && stepResult.success && (
                            <p className="text-[10px] text-[#22c55e]">
                              {stepResult.message}
                            </p>
                          )}
                          {isManual && step.params?.instruction && (
                            <p className="text-[10px] text-muted-foreground mt-1 italic">
                              {step.params.instruction}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {plan && !isPlanning && (
          <div className="border-t border-white/5 pt-4 flex items-center justify-between gap-3">
            {!results ? (
              <>
                <p className="text-[10px] text-muted-foreground">
                  {selectedCount} de {executableCount} acao(oes) selecionada(s)
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleExecute}
                    disabled={isExecuting || selectedCount === 0}
                    className="gap-2"
                  >
                    {isExecuting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Executando...
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-3.5 w-3.5" />
                        Confirmar e Executar ({selectedCount})
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[10px] text-muted-foreground">
                  {results.filter((r) => r.success).length} sucesso(s),{" "}
                  {results.filter((r) => !r.success).length} falha(s)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      reset();
                      setHasGenerated(false);
                      setSelectedSteps(new Set());
                    }}
                    className="gap-2"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Novo Plano
                  </Button>
                  <Button size="sm" onClick={handleClose}>
                    Fechar
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
