import { useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  Lightbulb,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  Zap,
} from "lucide-react";
import { useDeepAnalysis } from "@/hooks/useDeepAnalysis";
import type {
  AnalysisReport,
  AIAlert,
  AIOpportunity,
  AIOptimization,
  AnalysisTrend,
} from "@/types/analysis";

interface AnalysisDashboardProps {
  clientId: string;
}

// ─── Score Circle ───

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 8
      ? "text-emerald-400 border-emerald-500/50"
      : score >= 5
        ? "text-yellow-400 border-yellow-500/50"
        : "text-red-400 border-red-500/50";

  const bgGlow =
    score >= 8
      ? "shadow-[0_0_20px_rgba(16,185,129,0.3)]"
      : score >= 5
        ? "shadow-[0_0_20px_rgba(234,179,8,0.3)]"
        : "shadow-[0_0_20px_rgba(239,68,68,0.3)]";

  return (
    <div
      className={`flex h-20 w-20 items-center justify-center rounded-full border-2 ${color} ${bgGlow} bg-surface`}
    >
      <span className={`text-3xl font-bold ${color.split(" ")[0]}`}>
        {score}
      </span>
    </div>
  );
}

// ─── Trend Badge ───

function TrendBadge({ trend }: { trend: AnalysisTrend }) {
  const config = {
    melhorando: {
      icon: TrendingUp,
      label: "Melhorando",
      className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    estavel: {
      icon: Minus,
      label: "Estável",
      className: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    },
    piorando: {
      icon: TrendingDown,
      label: "Piorando",
      className: "text-red-400 bg-red-500/10 border-red-500/30",
    },
  }[trend];

  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </div>
  );
}

// ─── Alert Card ───

function AlertCard({ alert }: { alert: AIAlert }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-red-300">
              {alert.titulo}
            </h4>
            {alert.campanha && (
              <p className="mt-0.5 text-[11px] text-red-400/70 truncate">
                Campanha: {alert.campanha}
              </p>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 pl-7 animate-fade-in">
          <p className="text-xs text-foreground/80 leading-relaxed">
            {alert.descricao}
          </p>
          <div className="rounded-md bg-red-500/10 p-2.5">
            <p className="text-[11px] font-medium text-red-300">
              Ação recomendada:
            </p>
            <p className="mt-0.5 text-xs text-foreground/70">{alert.acao}</p>
          </div>
          <p className="text-[11px] text-red-400/80">
            Impacto estimado: {alert.impacto_estimado}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Opportunity Card ───

function OpportunityCard({ opp }: { opp: AIOpportunity }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-emerald-300">
              {opp.titulo}
            </h4>
            {opp.campanha && (
              <p className="mt-0.5 text-[11px] text-emerald-400/70 truncate">
                Campanha: {opp.campanha}
              </p>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 pl-7 animate-fade-in">
          <p className="text-xs text-foreground/80 leading-relaxed">
            {opp.descricao}
          </p>
          <div className="rounded-md bg-emerald-500/10 p-2.5">
            <p className="text-[11px] font-medium text-emerald-300">
              Ação recomendada:
            </p>
            <p className="mt-0.5 text-xs text-foreground/70">{opp.acao}</p>
          </div>
          <p className="text-[11px] text-emerald-400/80">
            Potencial: {opp.potencial}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Optimization Item ───

function OptimizationItem({
  opt,
  onToggle,
  done,
}: {
  opt: AIOptimization;
  onToggle: () => void;
  done: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const priorityBadge = {
    alta: "bg-red-500/20 text-red-400 border-red-500/30",
    media: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    baixa: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  }[opt.prioridade];

  return (
    <div
      className={`rounded-lg border border-border/50 bg-surface p-4 transition-opacity ${done ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            done
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-border hover:border-foreground/50"
          }`}
        >
          {done && <CheckCircle2 className="h-3.5 w-3.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-left"
          >
            <div className="flex items-center gap-2">
              <h4
                className={`text-sm font-medium ${done ? "line-through text-muted-foreground" : "text-foreground"}`}
              >
                {opt.titulo}
              </h4>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${priorityBadge}`}
              >
                {opt.prioridade}
              </span>
            </div>
            {opt.campanha && (
              <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                Campanha: {opt.campanha}
              </p>
            )}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 animate-fade-in">
              <p className="text-xs text-foreground/80 leading-relaxed">
                {opt.descricao}
              </p>
              <div className="rounded-md bg-muted/30 p-2.5">
                <p className="text-[11px] font-medium text-foreground/90">
                  Ação:
                </p>
                <p className="mt-0.5 text-xs text-foreground/70">{opt.acao}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Skeleton ───

function AnalysisSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center gap-6">
        <div className="h-20 w-20 rounded-full bg-muted/30" />
        <div className="space-y-2 flex-1">
          <div className="h-4 w-24 rounded bg-muted/30" />
          <div className="h-3 w-full max-w-md rounded bg-muted/30" />
          <div className="h-3 w-3/4 rounded bg-muted/30" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-lg bg-muted/20" />
      ))}
    </div>
  );
}

// ─── Empty State ───

function EmptyState({ onAnalyze, isAnalyzing }: { onAnalyze: () => void; isAnalyzing: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Sparkles className="mb-4 h-10 w-10 text-primary/50" />
      <h3 className="text-lg font-semibold text-foreground">
        Análise Profunda com IA
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Gere uma análise detalhada das suas campanhas com detecção de anomalias,
        tendências e recomendações acionáveis.
      </p>
      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        {isAnalyzing ? (
          <>
            <RefreshCw className="h-4 w-4 animate-spin" />
            Analisando...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Gerar Análise Profunda
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main Component ───

export function AnalysisDashboard({ clientId }: AnalysisDashboardProps) {
  const {
    analysis,
    isAnalyzing,
    isLoadingCache,
    error,
    analyze,
    forceAnalyze,
    isCacheFresh,
  } = useDeepAnalysis(clientId);

  const [doneItems, setDoneItems] = useState<Set<number>>(new Set());

  const toggleDone = (idx: number) => {
    setDoneItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (isLoadingCache) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <AnalysisSkeleton />
      </div>
    );
  }

  if (!analysis && !isAnalyzing) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <EmptyState onAnalyze={analyze} isAnalyzing={isAnalyzing} />
      </div>
    );
  }

  if (isAnalyzing && !analysis) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <AnalysisSkeleton />
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Gerando análise profunda... isso pode levar até 30 segundos.</span>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  const timeAgo = analysis.created_at
    ? formatTimeAgo(new Date(analysis.created_at))
    : "";

  // Sort optimizations by priority
  const sortedOptimizations = [...(analysis.otimizacoes || [])].sort((a, b) => {
    const order = { alta: 0, media: 1, baixa: 2 };
    return (order[a.prioridade] ?? 2) - (order[b.prioridade] ?? 2);
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-5">
            <ScoreCircle score={analysis.score} />
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-foreground">
                  Score da Conta
                </h2>
                <TrendBadge trend={analysis.tendencia} />
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                {analysis.resumo}
              </p>
              {timeAgo && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Última análise: {timeAgo}
                  {analysis.modelo_ia && (
                    <span className="ml-2 text-muted-foreground/60">
                      ({analysis.modelo_ia})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={isCacheFresh ? forceAnalyze : analyze}
            disabled={isAnalyzing}
            className="shrink-0 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/30 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Analisar novamente
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Alertas Críticos ── */}
      {analysis.alertas_criticos && analysis.alertas_criticos.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-400">
              Alertas Críticos
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.alertas_criticos.map((alert, idx) => (
              <AlertCard key={idx} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* ── Oportunidades ── */}
      {analysis.oportunidades && analysis.oportunidades.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
              Oportunidades
            </h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {analysis.oportunidades.map((opp, idx) => (
              <OpportunityCard key={idx} opp={opp} />
            ))}
          </div>
        </div>
      )}

      {/* ── Otimizações ── */}
      {sortedOptimizations.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              Otimizações
            </h3>
          </div>
          <div className="space-y-2">
            {sortedOptimizations.map((opt, idx) => (
              <OptimizationItem
                key={idx}
                opt={opt}
                done={doneItems.has(idx)}
                onToggle={() => toggleDone(idx)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Previsão ── */}
      {analysis.previsao && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-start gap-3">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Previsão para os próximos 7 dias
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">
                {analysis.previsao}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helper ───

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `${diffMin}min atrás`;
  if (diffHours < 24) return `${diffHours}h atrás`;
  return `${diffDays}d atrás`;
}
