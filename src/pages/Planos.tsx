import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Check, Loader2, BarChart3, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// URL de checkout gerada no painel da Kirvano
const KIRVANO_CHECKOUT_URL = import.meta.env.VITE_KIRVANO_CHECKOUT_URL;

const PLAN_FEATURES = [
  "Até 3 clientes",
  "Google Ads integrado",
  "Meta Ads integrado",
  "Google Analytics 4 integrado",
  "Dashboard visual em tempo real",
  "Controle do que o cliente pode ver",
  "Acesso imediato após o pagamento",
];

type SubscriptionStatus = "active" | "canceled" | "inactive" | "loading" | null;

export default function PlanosPage() {
  const [searchParams] = useSearchParams();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>("loading");

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "sucesso") {
      toast.success("Pagamento confirmado! Bem-vindo ao Persona Lens.");
    }
  }, [searchParams]);

  useEffect(() => {
    async function fetchSubscription() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSubscriptionStatus(null); return; }

      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", session.user.id)
        .single();

      setSubscriptionStatus((data?.status as SubscriptionStatus) || "inactive");
    }
    fetchSubscription();
  }, []);

  const isActive = subscriptionStatus === "active";
  const isLoadingStatus = subscriptionStatus === "loading";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-lg mx-auto px-6 py-16">
        {/* Header */}
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-10">
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
            <BarChart3 className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Plano Fundadores</h1>
          <p className="mt-2 text-muted-foreground">
            Acesso completo à plataforma. Preço especial para os primeiros usuários.
          </p>
        </div>

        {/* Pricing card */}
        <div className="rounded-2xl border border-primary/30 bg-card p-8 shadow-lg ring-1 ring-primary/10">
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">R$97</span>
              <span className="text-muted-foreground">/mês</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Cobrança recorrente mensal · Cancele quando quiser
            </p>
          </div>

          <ul className="mb-8 space-y-3">
            {PLAN_FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm">
                <Check className="h-4 w-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>

          {isLoadingStatus ? (
            <Button className="w-full" disabled>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verificando assinatura...
            </Button>
          ) : isActive ? (
            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <p className="text-sm font-semibold text-primary">✓ Assinatura ativa</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Você já tem acesso completo à plataforma.
              </p>
            </div>
          ) : KIRVANO_CHECKOUT_URL ? (
            <Button className="w-full text-base py-6" asChild>
              <a href={KIRVANO_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
                Começar agora — R$97/mês
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button className="w-full text-base py-6" disabled>
              Link de pagamento não configurado
            </Button>
          )}

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Pagamento seguro via{" "}
            <span className="font-medium text-foreground">Kirvano</span>.
            Cancele a qualquer momento.
          </p>
        </div>

        {/* FAQ */}
        <div className="mt-10 space-y-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Perguntas frequentes
          </h2>
          {[
            {
              q: "Posso cancelar a qualquer momento?",
              a: "Sim. O cancelamento é feito direto na Kirvano e você mantém acesso até o fim do período pago.",
            },
            {
              q: "O que acontece quando ultrapassar 3 clientes?",
              a: "Você será notificado. Novos planos com mais clientes estarão disponíveis em breve.",
            },
            {
              q: "Os dados dos meus clientes ficam seguros?",
              a: "Sim. Usamos Row-Level Security e criptografia. Cada usuário só acessa seus próprios dados.",
            },
            {
              q: "Já paguei mas meu acesso não foi liberado. O que faço?",
              a: "Certifique-se de usar o mesmo e-mail do pagamento ao se cadastrar. Se o problema persistir, envie o comprovante para contato@personalens.com.br.",
            },
          ].map(({ q, a }) => (
            <div key={q}>
              <p className="text-sm font-medium">{q}</p>
              <p className="mt-1 text-sm text-muted-foreground">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
