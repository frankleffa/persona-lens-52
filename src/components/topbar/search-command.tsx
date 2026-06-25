"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Contact,
  LayoutDashboard,
  Megaphone,
  Plug,
  Search,
  Users,
  FileBarChart,
  ListChecks,
} from "lucide-react";
import { clients } from "@/components/clients/data";
import { rows as campaignRows } from "@/components/campaigns/meta-data";

const pages = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Campanhas", href: "/campanhas", icon: Megaphone },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "CRM", href: "/crm", icon: Contact },
  { label: "Relatórios", href: "/relatorios", icon: FileBarChart },
  { label: "Execução", href: "/execucao", icon: ListChecks },
  { label: "Conexões", href: "/conexoes", icon: Plug },
];

type Result = { id: string; label: string; group: string; href: string; icon: React.ElementType };

export function SearchCommand() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: Result[] = [];
    pages.filter((p) => p.label.toLowerCase().includes(q)).forEach((p) =>
      out.push({ id: `pg-${p.href}`, label: p.label, group: "Páginas", href: p.href, icon: p.icon })
    );
    clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 5).forEach((c) =>
      out.push({ id: `cl-${c.id}`, label: c.name, group: "Clientes", href: `/clientes/${c.id}`, icon: Users })
    );
    campaignRows
      .filter((r) => r.level === "campaign" && r.name.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((r) => out.push({ id: `cp-${r.id}`, label: r.name, group: "Campanhas", href: "/campanhas", icon: Megaphone }));
    return out;
  }, [query]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  const grouped = results.reduce<Record<string, Result[]>>((acc, r) => {
    (acc[r.group] ||= []).push(r);
    return acc;
  }, {});

  return (
    <div ref={wrap} className="relative hidden flex-1 md:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft-foreground" />
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar campanhas, clientes…"
        className="h-9 w-full max-w-sm rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
      />
      {open && query.trim() && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-1 w-full max-w-sm rounded-md border border-border bg-popover p-1 shadow-xl">
            {results.length === 0 ? (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nada encontrado.</p>
            ) : (
              Object.entries(grouped).map(([group, items]) => (
                <div key={group}>
                  <p className="px-2.5 pb-1 pt-2 text-[10px] uppercase tracking-wide text-soft-foreground">{group}</p>
                  {items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => go(r.href)}
                      className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2"
                    >
                      <r.icon className="size-4 text-muted-foreground" />
                      <span className="truncate">{r.label}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
