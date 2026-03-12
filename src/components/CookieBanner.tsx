import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const COOKIE_KEY = "persona_lens_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY);
    if (!consent) {
      // Small delay so it doesn't flash on initial render
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  };

  const dismiss = () => {
    localStorage.setItem(COOKIE_KEY, "dismissed");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl animate-slide-up rounded-xl border border-border bg-card p-5 shadow-2xl"
    >
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            Usamos cookies essenciais
          </p>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
            Utilizamos apenas cookies necessários para manter sua sessão autenticada.
            Não usamos cookies de rastreamento ou publicidade. Saiba mais em nossa{" "}
            <Link
              to="/politica-de-privacidade"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={dismiss}>
          Recusar opcionais
        </Button>
        <Button size="sm" onClick={accept}>
          Aceitar e continuar
        </Button>
      </div>
    </div>
  );
}
