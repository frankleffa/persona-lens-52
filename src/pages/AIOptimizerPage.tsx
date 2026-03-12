import AIOptimizer from "@/components/AIOptimizer";
import { useAdsData } from "@/hooks/useAdsData";
import { Loader2 } from "lucide-react";

export default function AIOptimizerPage() {
  const { data, loading } = useAdsData();

  return (
    <div className="min-h-screen bg-background">
      <div className="ml-64 p-8">
        <div className="mb-6 animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground">IA Otimizadora</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analise e otimize suas campanhas com inteligência artificial. A IA pode executar ações reais nas suas plataformas.
          </p>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Carregando dados das campanhas...</span>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl">
            <AIOptimizer campaignData={data} />
          </div>
        )}
      </div>
    </div>
  );
}
