import { useState } from "react";
import {
  Sparkles,
  Copy,
  Check,
  X,
  Wand2,
  Loader2,
  ChevronDown,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useCreativeSuggestions,
  type CreativeSuggestion,
} from "@/hooks/useCreativeSuggestions";

interface CreativeSuggestionsPanelProps {
  clientId: string;
  onGenerate: (replacesAdName?: string) => void;
}

const angleColors: Record<string, string> = {
  curiosidade: "#8b5cf6",
  prova_social: "#22c55e",
  urgencia: "#ef4444",
  contraste: "#f59e0b",
  autoridade: "#3b82f6",
  historia: "#ec4899",
  objecao: "#eab308",
  beneficio_concreto: "#14b8a6",
};

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function copyToClipboard(text: string, label: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`${label} copiado.`))
    .catch(() => toast.error("Nao foi possivel copiar."));
}

function copyFullCreative(s: CreativeSuggestion) {
  const text = [
    `HOOK: ${s.hook}`,
    `HEADLINE: ${s.headline}`,
    "",
    s.primary_text,
    "",
    s.cta ? `CTA: ${s.cta}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  copyToClipboard(text, "Criativo completo");
}

function SuggestionCard({
  suggestion,
  onMarkUsed,
  onDiscard,
  isUpdating,
}: {
  suggestion: CreativeSuggestion;
  onMarkUsed: (id: string) => void;
  onDiscard: (id: string) => void;
  isUpdating: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const angleColor = suggestion.angulo
    ? angleColors[suggestion.angulo] || "#94a3b8"
    : "#94a3b8";

  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface)] p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {suggestion.angulo && (
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `${angleColor}1a`,
                  color: angleColor,
                }}
              >
                {suggestion.angulo.replace(/_/g, " ")}
              </span>
            )}
            {suggestion.replaces_ad_name && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                substitui: {suggestion.replaces_ad_name}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              {formatDate(suggestion.created_at)}
            </span>
          </div>
          <p className="text-xs font-semibold text-foreground leading-snug">
            {suggestion.hook}
          </p>
          <p className="text-xs text-muted-foreground leading-snug">
            {suggestion.headline}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="space-y-2 pt-1 border-t border-white/5">
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Texto principal
            </p>
            <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {suggestion.primary_text}
            </p>
          </div>
          {suggestion.cta && (
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                CTA
              </p>
              <p className="text-xs text-foreground">{suggestion.cta}</p>
            </div>
          )}
          {suggestion.por_que_funciona && (
            <div className="rounded border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-2">
              <p className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold mb-0.5">
                Por que funciona
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {suggestion.por_que_funciona}
              </p>
            </div>
          )}
          {suggestion.reference_ads && suggestion.reference_ads.length > 0 && (
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Inspirado em
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestion.reference_ads.map((ref, i) => (
                  <span
                    key={i}
                    className="text-[10px] text-muted-foreground bg-white/5 rounded px-1.5 py-0.5"
                  >
                    {ref.ad_name || `ad ${i + 1}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
          className="h-6 px-2 text-[10px] gap-1"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {expanded ? "Recolher" : "Ver completo"}
        </Button>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => copyFullCreative(suggestion)}
            className="h-6 px-2 text-[10px] gap-1"
          >
            <Copy className="h-3 w-3" />
            Copiar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMarkUsed(suggestion.id)}
            disabled={isUpdating}
            className="h-6 px-2 text-[10px] gap-1 text-[#22c55e] hover:text-[#22c55e]"
          >
            <Check className="h-3 w-3" />
            Usei
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDiscard(suggestion.id)}
            disabled={isUpdating}
            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground hover:text-[#ef4444]"
          >
            <X className="h-3 w-3" />
            Descartar
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CreativeSuggestionsPanel({
  clientId,
  onGenerate,
}: CreativeSuggestionsPanelProps) {
  const { pending, used, isLoading, isUpdating, markUsed, discard } =
    useCreativeSuggestions(clientId);
  const [showUsed, setShowUsed] = useState(false);

  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface)]/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-foreground">
            Banco de criativos sugeridos
          </h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {pending.length} pendente{pending.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onGenerate()}
          className="gap-1.5 h-7 text-[11px]"
        >
          <Wand2 className="h-3 w-3" />
          Gerar novos
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded border border-dashed border-white/10 p-6 text-center">
          <Wand2 className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs text-muted-foreground mb-1">
            Nenhuma sugestao pendente
          </p>
          <p className="text-[10px] text-muted-foreground">
            Clique em "Gerar novos" e Claude vai criar 5 variacoes baseadas nos
            seus melhores anuncios.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pending.map((s) => (
            <SuggestionCard
              key={s.id}
              suggestion={s}
              onMarkUsed={markUsed}
              onDiscard={discard}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}

      {used.length > 0 && (
        <div className="pt-2 border-t border-white/5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowUsed((v) => !v)}
            className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
          >
            <RefreshCcw className="h-3 w-3" />
            {showUsed ? "Esconder" : "Ver"} criativos usados ({used.length})
          </Button>
          {showUsed && (
            <div className="space-y-2 mt-2 opacity-70">
              {used.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onMarkUsed={markUsed}
                  onDiscard={discard}
                  isUpdating={isUpdating}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
