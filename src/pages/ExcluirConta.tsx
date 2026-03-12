import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export default function ExcluirConta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const CONFIRMATION_WORD = "EXCLUIR";
  const isReady = confirmation === CONFIRMATION_WORD;

  const handleDelete = async () => {
    if (!isReady || !user) return;
    setLoading(true);

    try {
      // Delete OAuth connections
      await supabase.from("oauth_connections").delete().eq("manager_id", user.id);
      // Delete subscription
      await supabase.from("subscriptions").delete().eq("user_id", user.id);
      // Sign out
      await supabase.auth.signOut();

      toast.success(
        "Solicitação de exclusão registrada. Seus dados serão removidos em até 30 dias."
      );
      navigate("/auth");
    } catch {
      toast.error("Erro ao processar solicitação. Tente novamente ou contate o suporte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-6 py-12">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Link>

        <div className="rounded-2xl border border-destructive/30 bg-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Excluir minha conta</h1>
              <p className="text-sm text-muted-foreground">Ação irreversível</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-600 dark:text-amber-400 space-y-1">
                <p className="font-semibold">O que será excluído:</p>
                <ul className="list-disc pl-4 space-y-0.5 text-xs">
                  <li>Sua conta e perfil</li>
                  <li>Todas as conexões OAuth (Google Ads, Meta Ads, GA4)</li>
                  <li>Vínculos com clientes</li>
                  <li>Dados de assinatura</li>
                  <li>Tokens de acesso armazenados</li>
                </ul>
                <p className="text-xs mt-2">
                  Os dados serão removidos definitivamente em até <strong>30 dias</strong>.
                  Cancelamentos de assinatura ativa devem ser feitos previamente no Stripe.
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              Para confirmar, digite <strong className="text-foreground">EXCLUIR</strong> abaixo:
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
              placeholder="EXCLUIR"
              className="font-mono"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/">Cancelar</Link>
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!isReady || loading}
              onClick={handleDelete}
            >
              {loading ? "Processando..." : "Excluir minha conta"}
            </Button>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Prefere apenas cancelar a assinatura?{" "}
            <Link to="/planos" className="underline hover:text-foreground">
              Gerencie seu plano aqui
            </Link>
            .
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Exercendo seus direitos LGPD? Também pode enviar um e-mail para{" "}
          <a href="mailto:privacidade@personalens.com.br" className="underline">
            privacidade@personalens.com.br
          </a>
          .
        </p>
      </div>
    </div>
  );
}
