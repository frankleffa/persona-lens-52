"use client";

import { useState } from "react";
import { Bell, Calendar, ChevronDown, Menu, Search, X } from "lucide-react";
import { SidebarContent } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export function AppTopbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-5 backdrop-blur lg:px-8">
        {/* hambúrguer mobile */}
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
          className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface text-foreground lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <div className="relative hidden flex-1 md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft-foreground" />
          <input
            placeholder="Buscar campanhas, clientes…"
            className="h-9 w-full max-w-sm rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="hidden h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong sm:flex">
            <Calendar className="size-4 text-muted-foreground" />
            Últimos 30 dias
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>

          <ThemeToggle />

          <button className="grid size-9 place-items-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground">
            <Bell className="size-4" />
          </button>

          <UserMenu />
        </div>
      </header>

      {/* Drawer de navegação mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-sidebar">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar"
              className="absolute right-3 top-4 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            >
              <X className="size-4" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
