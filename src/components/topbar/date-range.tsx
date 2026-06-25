"use client";

import { useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const presets = ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 14 dias", "Últimos 30 dias", "Este mês"];

export function DateRangePicker() {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("Últimos 30 dias");
  const [custom, setCustom] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  return (
    <div className="relative hidden sm:block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong"
      >
        <Calendar className="size-4 text-muted-foreground" />
        {value}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-xl">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => { setValue(p); setCustom(false); setOpen(false); }}
                className="flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2"
              >
                {p}
                {value === p && <Check className="size-4 text-primary" />}
              </button>
            ))}
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => setCustom((c) => !c)}
              className="flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2"
            >
              Personalizado
              <ChevronDown className={cn("size-3.5 transition-transform", custom && "rotate-180")} />
            </button>
            {custom && (
              <div className="flex flex-col gap-2 p-2">
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 rounded-md border border-input bg-surface px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 rounded-md border border-input bg-surface px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
                <Button
                  size="sm"
                  disabled={!from || !to}
                  onClick={() => {
                    const fmt = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
                    setValue(`${fmt(from)} – ${fmt(to)}`);
                    setOpen(false);
                  }}
                >
                  Aplicar
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
