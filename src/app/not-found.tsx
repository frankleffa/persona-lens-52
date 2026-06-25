import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-6">
      <div className="text-center">
        <p className="metric text-6xl font-semibold tracking-tight text-primary">404</p>
        <h1 className="mt-4 text-xl font-semibold text-foreground">Página não encontrada</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild variant="outline"><Link href="/">Ir para a home</Link></Button>
          <Button asChild><Link href="/dashboard">Abrir o app</Link></Button>
        </div>
      </div>
    </div>
  );
}
