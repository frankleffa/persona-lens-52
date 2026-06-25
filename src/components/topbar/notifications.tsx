"use client";

import { useState } from "react";
import { Bell, FileText, MessageCircle, TrendingDown, UserPlus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Notif = { id: string; icon: React.ElementType; tint: string; text: string; time: string; read: boolean };

const seed: Notif[] = [
  { id: "1", icon: MessageCircle, tint: "var(--success)", text: "Relatório de Bella Estética entregue no WhatsApp", time: "há 8 min", read: false },
  { id: "2", icon: Zap, tint: "var(--primary)", text: "Regra pausou “Topo — Vídeo Reels” (CPA acima da meta)", time: "há 1 h", read: false },
  { id: "3", icon: TrendingDown, tint: "var(--warning)", text: "Saldo baixo na conta da Clínica Vitalis", time: "há 3 h", read: false },
  { id: "4", icon: UserPlus, tint: "var(--chart-3)", text: "Novo lead no CRM: Studio Pilates Move", time: "ontem", read: true },
  { id: "5", icon: FileText, tint: "var(--muted-foreground)", text: "Relatório mensal da Diretoria agendado p/ 01/07", time: "ontem", read: true },
];

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>(seed);
  const unread = items.filter((i) => !i.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificações"
        title="Notificações"
        className="relative grid size-9 place-items-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
      >
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary ring-2 ring-background" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-popover shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <p className="text-sm font-medium text-foreground">Notificações</p>
              {unread > 0 && (
                <button onClick={() => setItems((it) => it.map((x) => ({ ...x, read: true })))} className="text-xs font-medium text-primary hover:underline">
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto scroll-slim">
              {items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setItems((it) => it.map((x) => (x.id === n.id ? { ...x, read: true } : x)))}
                  className={cn("flex w-full items-start gap-3 border-b border-border/60 px-3 py-3 text-left transition-colors hover:bg-surface-2", !n.read && "bg-primary-soft/30")}
                >
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md" style={{ background: `color-mix(in srgb, ${n.tint} 16%, transparent)`, color: n.tint }}>
                    <n.icon className="size-3.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm leading-snug text-foreground">{n.text}</span>
                    <span className="text-xs text-soft-foreground">{n.time}</span>
                  </span>
                  {!n.read && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
