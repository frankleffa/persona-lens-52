import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

const GROWTH_PRICE_ID = "price_1T1ixdHWjAHcBQNv4qUqASKe";

interface UpgradeBannerProps {
  feature: string;
  description?: string;
}

export default function UpgradeBanner({ feature, description }: UpgradeBannerProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: GROWTH_PRICE_ID },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao iniciar checkout", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
        <div className="mx-auto max-w-lg text-center py-24 animate-fade-in">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Recurso exclusivo do plano Growth
          </h2>
          <p className="text-muted-foreground mb-2">
            <strong>{feature}</strong> não está disponível no seu plano atual.
          </p>
          {description && (
            <p className="text-sm text-muted-foreground mb-8">{description}</p>
          )}
          <Button size="lg" className="gap-2" onClick={handleUpgrade} disabled={loading}>
            <Rocket className="h-4 w-4" />
            {loading ? "Redirecionando..." : "Fazer upgrade para Growth"}
          </Button>
        </div>
      </div>
    </div>
  );
}
