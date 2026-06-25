"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Contact,
  FileBarChart,
  ListChecks,
  Plug,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string; icon: React.ElementType };

const operacao: Item[] = [
  { label: "Visão geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Campanhas", href: "/campanhas", icon: Megaphone },
  { label: "Execução", href: "/execucao", icon: ListChecks },
  { label: "Relatórios", href: "/relatorios", icon: FileBarChart },
];

const gestao: Item[] = [
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "CRM", href: "/crm", icon: Contact },
  { label: "Conexões", href: "/conexoes", icon: Plug },
];

function isActive(pathname: string, href: string) {
  if (href === "#") return false;
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function NavGroup({ title, items, pathname }: { title: string; items: Item[]; pathname: string }) {
  return (
    <div className="px-3">
      <p className="eyebrow px-3 pb-2 pt-4">{title}</p>
      <nav className="flex flex-col gap-0.5">
        {items.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar lg:flex">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
          <span className="text-sm font-bold">A</span>
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          AdScape
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scroll-slim pb-4">
        <NavGroup title="Operação" items={operacao} pathname={pathname} />
        <NavGroup title="Gestão" items={gestao} pathname={pathname} />
      </div>

      <div className="border-t border-border p-3">
        <Link
          href="/configuracoes"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, "/configuracoes")
              ? "bg-primary-soft text-primary"
              : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          )}
        >
          <Settings className="size-4" />
          Configurações
        </Link>
      </div>
    </aside>
  );
}
