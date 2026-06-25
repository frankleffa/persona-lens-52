"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção, enviar para um serviço de monitoramento (Sentry etc.).
    console.error(error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="max-w-md text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-foreground">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Encontramos um erro inesperado. Você pode tentar novamente ou voltar para o início.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-soft-foreground">Código: {error.digest}</p>
        )}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw />
            Tentar novamente
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Ir para a home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
