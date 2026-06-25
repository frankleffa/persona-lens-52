"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarContent } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { SearchCommand } from "@/components/topbar/search-command";
import { DateRangePicker } from "@/components/topbar/date-range";
import { NotificationsMenu } from "@/components/topbar/notifications";

export function AppTopbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-5 backdrop-blur lg:px-8">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Menu"
          className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-surface text-foreground lg:hidden"
        >
          <Menu className="size-4" />
        </button>

        <SearchCommand />

        <div className="ml-auto flex items-center gap-2">
          <DateRangePicker />
          <ThemeToggle />
          <NotificationsMenu />
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
