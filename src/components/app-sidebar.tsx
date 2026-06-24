import Link from "next/link";
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

type Item = { label: string; href: string; icon: React.ElementType; active?: boolean };

const operacao: Item[] = [
  { label: "Visão geral", href: "/", icon: LayoutDashboard, active: true },
  { label: "Campanhas", href: "#", icon: Megaphone },
  { label: "Execução", href: "#", icon: ListChecks },
  { label: "Relatórios", href: "#", icon: FileBarChart },
];

const gestao: Item[] = [
  { label: "Clientes", href: "#", icon: Users },
  { label: "CRM", href: "#", icon: Contact },
  { label: "Conexões", href: "#", icon: Plug },
];

function NavGroup({ title, items }: { title: string; items: Item[] }) {
  return (
    <div className="px-3">
      <p className="eyebrow px-3 pb-2 pt-4">{title}</p>
      <nav className="flex flex-col gap-0.5">
        {items.map(({ label, href, icon: Icon, active }) => (
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
        ))}
      </nav>
    </div>
  );
}

export function AppSidebar() {
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
        <NavGroup title="Operação" items={operacao} />
        <NavGroup title="Gestão" items={gestao} />
      </div>

      <div className="border-t border-border p-3">
        <Link
          href="#"
          className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Settings className="size-4" />
          Configurações
        </Link>
      </div>
    </aside>
  );
}
