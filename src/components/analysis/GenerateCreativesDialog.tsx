import { useEffect, useState } from "react";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreativeSuggestions } from "@/hooks/useCreativeSuggestions";

interface GenerateCreativesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  defaultReplacesAdName?: string;
  defaultContextNote?: string;
}

export function GenerateCreativesDialog({
  open,
  onOpenChange,
  clientId,
  defaultReplacesAdName,
  defaultContextNote,
}: GenerateCreativesDialogProps) {
  const { generate, isGenerating } = useCreativeSuggestions(clientId);
  const [replacesAdName, setReplacesAdName] = useState("");
  const [contextNote, setContextNote] = useState("");

  useEffect(() => {
    if (open) {
      setReplacesAdName(defaultReplacesAdName ?? "");
      setContextNote(defaultContextNote ?? "");
    }
  }, [open, defaultReplacesAdName, defaultContextNote]);

  const handleGenerate = async () => {
    try {
      await generate({ replacesAdName, contextNote });
      onOpenChange(false);
    } catch {
      // toast handled in hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isGenerating && onOpenChange(isOpen)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="h-4 w-4 text-[var(--accent)]" />
            Gerar criativos com Claude
          </DialogTitle>
          <DialogDescription className="text-xs">
            Claude vai analisar seus 4 melhores anuncios dos ultimos 14 dias e
            gerar 5 variacoes novas inspiradas no que ja funciona.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="replaces" className="text-xs">
              Anuncio para substituir <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Input
              id="replaces"
              value={replacesAdName}
              onChange={(e) => setReplacesAdName(e.target.value)}
              placeholder="Ex: Criativo_VSL_v3"
              disabled={isGenerating}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Se preencher, Claude vai gerar variacoes pra substituir esse anuncio
              (util pra fadiga alta).
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="context" className="text-xs">
              Contexto adicional <span className="text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="context"
              value={contextNote}
              onChange={(e) => setContextNote(e.target.value)}
              placeholder="Ex: Foco em publico frio, evite promessas absolutas, queremos testar angulo de objecao."
              disabled={isGenerating}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/5 p-3 flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent)] mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <p className="text-[11px] font-medium text-foreground">
                Como funciona
              </p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Buscamos seus top 4 anuncios por CPA (ou CTR se nao houver
                conversoes). Claude le hook, headline e copy de cada um e gera
                5 variacoes com angulos diferentes (curiosidade, prova social,
                urgencia, etc).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/5 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Wand2 className="h-3.5 w-3.5" />
                Gerar 5 variacoes
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
