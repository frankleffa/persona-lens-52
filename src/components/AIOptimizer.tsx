import { useState, useRef, useEffect } from "react";
import { useAIOptimizer, type AIAction, type AIMessage } from "@/hooks/useAIOptimizer";
import type { AdsDataResult } from "@/hooks/useAdsData";
import { Bot, Send, Loader2, Zap, Pause, Play, DollarSign, CheckCircle2, XCircle, AlertTriangle, Trash2, Sparkles } from "lucide-react";

interface AIOptimizerProps {
  campaignData: AdsDataResult | null;
}

const ACTION_ICONS = {
  pause_campaign: Pause,
  enable_campaign: Play,
  adjust_budget: DollarSign,
};

const ACTION_LABELS = {
  pause_campaign: "Pausar",
  enable_campaign: "Ativar",
  adjust_budget: "Ajustar Budget",
};

const PLATFORM_LABELS = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
};

const QUICK_PROMPTS = [
  "Analise minhas campanhas e sugira otimizações",
  "Quais campanhas estão com CPA muito alto?",
  "Redistribua o budget para campanhas mais eficientes",
  "Pause as campanhas que não estão performando",
];

function ActionCard({
  action,
  selected,
  onToggle,
}: {
  action: AIAction;
  selected: boolean;
  onToggle: () => void;
}) {
  const Icon = ACTION_ICONS[action.type] || Zap;

  return (
    <button
      onClick={onToggle}
      className={`w-full text-left rounded-lg border p-3 transition-all ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border bg-card hover:border-primary/40"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            action.type === "pause_campaign"
              ? "bg-amber-500/15 text-amber-500"
              : action.type === "enable_campaign"
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-blue-500/15 text-blue-500"
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">
              {PLATFORM_LABELS[action.platform]} - {ACTION_LABELS[action.type]}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-foreground truncate">
            {action.campaign_name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{action.description}</p>
          {action.value !== undefined && (
            <p className="mt-1 text-xs font-semibold text-primary">
              Novo valor: R$ {action.value.toFixed(2)}
            </p>
          )}
          <p className="mt-1 text-xs text-emerald-500">{action.impact}</p>
        </div>
        <div
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
            selected
              ? "border-primary bg-primary text-primary-foreground"
              : "border-muted-foreground/30"
          }`}
        >
          {selected && <CheckCircle2 className="h-3 w-3" />}
        </div>
      </div>
    </button>
  );
}

function MessageBubble({
  message,
  onExecuteActions,
  executing,
}: {
  message: AIMessage;
  onExecuteActions: (actions: AIAction[]) => void;
  executing: boolean;
}) {
  const [selectedActions, setSelectedActions] = useState<Set<string>>(new Set());
  const isUser = message.role === "user";
  const hasActions = message.actions && message.actions.length > 0;
  const hasResults = message.executionResults && message.executionResults.length > 0;

  const toggleAction = (actionId: string) => {
    setSelectedActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });
  };

  const selectAll = () => {
    if (!message.actions) return;
    if (selectedActions.size === message.actions.length) {
      setSelectedActions(new Set());
    } else {
      setSelectedActions(new Set(message.actions.map((a) => a.id)));
    }
  };

  const handleExecute = () => {
    if (!message.actions) return;
    const toExecute = message.actions.filter((a) => selectedActions.has(a.id));
    if (toExecute.length > 0) {
      onExecuteActions(toExecute);
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        }`}
      >
        {isUser ? (
          <span className="text-xs font-bold">Eu</span>
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div className={`flex-1 space-y-3 ${isUser ? "text-right" : ""}`}>
        <div
          className={`inline-block max-w-full rounded-lg px-4 py-3 text-sm ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-foreground"
          }`}
        >
          <p className="whitespace-pre-wrap text-left">{message.content}</p>
        </div>

        {hasActions && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-semibold text-foreground">
                  Ações Sugeridas ({message.actions!.length})
                </span>
              </div>
              <button
                onClick={selectAll}
                className="text-xs text-primary hover:underline"
              >
                {selectedActions.size === message.actions!.length
                  ? "Desmarcar todas"
                  : "Selecionar todas"}
              </button>
            </div>

            <div className="space-y-2">
              {message.actions!.map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  selected={selectedActions.has(action.id)}
                  onToggle={() => toggleAction(action.id)}
                />
              ))}
            </div>

            {selectedActions.size > 0 && (
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {executing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Executar {selectedActions.size} ação(ões)
                  </>
                )}
              </button>
            )}

            {selectedActions.size > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  As ações selecionadas serão executadas diretamente nas plataformas de anúncios.
                  Certifique-se de que deseja aplicar estas mudanças.
                </p>
              </div>
            )}
          </div>
        )}

        {hasResults && (
          <div className="space-y-1.5">
            {message.executionResults!.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                  r.success
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-red-500/20 bg-red-500/5"
                }`}
              >
                {r.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
                )}
                <p className="text-xs text-foreground">{r.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AIOptimizer({ campaignData }: AIOptimizerProps) {
  const { messages, loading, executing, sendMessage, executeActions, clearMessages } =
    useAIOptimizer();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput("");
    sendMessage(msg, campaignData);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    sendMessage(prompt, campaignData);
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">IA Otimizadora</h3>
            <p className="text-xs text-muted-foreground">Analise e otimize suas campanhas</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Limpar conversa"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4" style={{ minHeight: "300px", maxHeight: "500px" }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-3">
              <Bot className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">
              Otimize suas campanhas com IA
            </h4>
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              A IA analisa seus dados e pode executar ações reais como pausar campanhas, ajustar budgets e mais.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={loading}
                  className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground text-left"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onExecuteActions={executeActions}
            executing={executing}
          />
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Analisando campanhas...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Peça uma análise ou otimização..."
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
