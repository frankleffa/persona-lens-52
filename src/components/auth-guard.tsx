"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/**
 * Protege as rotas do grupo (app): exige uma sessão Supabase ativa.
 * Enquanto verifica, mostra um estado de carregamento. Sem sessão,
 * redireciona para /auth guardando a rota de origem em ?next=.
 *
 * Observação: este é um guard no cliente — suficiente enquanto a camada
 * de dados ainda usa mocks. Quando o backend for religado, mover a
 * verificação para middleware/SSR (Fase de backend do ROADMAP).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<"loading" | "authed">("loading");

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        setStatus("authed");
      } else {
        const next = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/auth?next=${next}`);
      }
    });

    // Reage a logout em outra aba / expiração de sessão.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (!session) {
        const next = encodeURIComponent(pathname || "/dashboard");
        router.replace(`/auth?next=${next}`);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [router, pathname]);

  if (status === "loading") {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm">Carregando seu painel…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
