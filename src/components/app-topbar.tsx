import { Bell, Calendar, ChevronDown, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppTopbar() {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-border bg-background/80 px-5 backdrop-blur lg:px-8">
      <div className="relative hidden flex-1 md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft-foreground" />
        <input
          placeholder="Buscar campanhas, clientes…"
          className="h-9 w-full max-w-sm rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong">
          <Calendar className="size-4 text-muted-foreground" />
          Últimos 30 dias
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>

        <ThemeToggle />

        <button className="grid size-9 place-items-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground">
          <Bell className="size-4" />
        </button>

        <div className="ml-1 grid size-9 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-foreground">
          FL
        </div>
      </div>
    </header>
  );
}
