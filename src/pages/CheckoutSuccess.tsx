import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function CheckoutSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="mx-auto max-w-md text-center animate-fade-in">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-3">
          Assinatura ativada com sucesso!
        </h1>
        <p className="text-muted-foreground mb-8">
          Seu plano já está ativo. Aproveite todos os recursos disponíveis.
        </p>
        <Button size="lg" onClick={() => navigate("/")}>
          Ir para o Dashboard
        </Button>
      </div>
    </div>
  );
}
