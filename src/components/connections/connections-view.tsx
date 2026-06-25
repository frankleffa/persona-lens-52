"use client";

import { useState } from "react";
import {
  ChevronDown,
  Loader2,
  RefreshCw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { WhatsAppConnect } from "./whatsapp-connect";
import {
  providers,
  initialAccounts,
  type Account,
  type Provider,
  type ProviderId,
} from "./data";

type AdProviderId = Exclude<ProviderId, "whatsapp">;

export function ConnectionsView() {
  const [connected, setConnected] = useState<Record<ProviderId, boolean>>({
    google_ads: true,
    meta_ads: true,
    ga4: false,
    whatsapp: false,
  });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [accounts, setAccounts] = useState(initialAccounts);
  const [syncing, setSyncing] = useState(false);
  const [waOpen, setWaOpen] = useState(false);
  const [waGroups, setWaGroups] = useState(0);

  const connectedCount = Object.values(connected).filter(Boolean).length;

  function connect(p: Provider) {
    if (p.id === "whatsapp") {
      setWaOpen(true);
      return;
    }
    setConnected((s) => ({ ...s, [p.id]: true }));
    setExpanded((s) => ({ ...s, [p.id]: true }));
    toast.success(`${p.label} conectado.`);
  }

  function disconnect(p: Provider) {
    setConnected((s) => ({ ...s, [p.id]: false }));
    setExpanded((s) => ({ ...s, [p.id]: false }));
    toast(`${p.label} desconectado.`);
  }

  function toggleAccount(pid: AdProviderId, id: string) {
    setAccounts((s) => ({
      ...s,
      [pid]: s[pid].map((a) => (a.id === id ? { ...a, active: !a.active } : a)),
    }));
  }

  function save(p: Provider, list: Account[]) {
    const n = list.filter((a) => a.active).length;
    toast.success(`${n} ${p.accountNoun} ativada(s) em ${p.label}.`);
  }

  function sync() {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      toast.success("Contas sincronizadas.");
    }, 1100);
  }

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Integrações</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Conexões
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Conecte suas plataformas e escolha quais contas alimentam o AdScape.
          </p>
        </div>
        <Button variant="outline" onClick={sync} disabled={syncing}>
          <RefreshCw className={cn(syncing && "animate-spin")} />
          {syncing ? "Sincronizando…" : "Sincronizar"}
        </Button>
      </div>

      <p className="mb-5 text-xs text-soft-foreground">
        <span className="tnum font-medium text-foreground">{connectedCount}</span> de{" "}
        {providers.length} plataformas conectadas
      </p>

      <div className="flex flex-col gap-4">
        {providers.map((p) => {
          const isConnected = connected[p.id];
          const isAd = p.id !== "whatsapp";
          const list = isAd ? accounts[p.id as AdProviderId] : [];
          const activeCount = list.filter((a) => a.active).length;
          const open = expanded[p.id];

          return (
            <Card key={p.id} className="overflow-hidden">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="grid size-11 shrink-0 place-items-center rounded-md text-base font-bold"
                    style={{
                      background: `color-mix(in srgb, ${p.tint} 16%, transparent)`,
                      color: p.tint,
                    }}
                  >
                    {p.letter}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{p.label}</h3>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      {isConnected ? (
                        <>
                          <span className="size-1.5 rounded-full bg-success" />
                          <span className="font-medium text-success">Conectado</span>
                          {isAd && (
                            <span className="text-soft-foreground">
                              · {activeCount} {p.accountNoun} ativas · sincronizado há 8 min
                            </span>
                          )}
                          {p.id === "whatsapp" && (
                            <span className="text-soft-foreground">· {waGroups} destino(s) ativos</span>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="size-1.5 rounded-full bg-border-strong" />
                          <span className="text-muted-foreground">{p.desc}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConnected && isAd && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded((s) => ({ ...s, [p.id]: !s[p.id] }))}
                    >
                      Gerenciar
                      <ChevronDown
                        className={cn("transition-transform", open && "rotate-180")}
                      />
                    </Button>
                  )}
                  {isConnected && p.id === "whatsapp" && (
                    <Button variant="ghost" size="sm" onClick={() => setWaOpen(true)}>
                      Gerenciar grupos
                    </Button>
                  )}
                  {isConnected ? (
                    <Button variant="outline" size="sm" onClick={() => disconnect(p)}>
                      Desconectar
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => connect(p)}>
                      Conectar
                    </Button>
                  )}
                </div>
              </div>

              {/* Lista de contas */}
              {isConnected && isAd && open && (
                <div className="border-t border-border bg-surface-2/40 p-5">
                  <p className="eyebrow mb-3">Selecione as {p.accountNoun} ativas</p>
                  <div className="flex flex-col gap-1.5">
                    {list.map((a) => (
                      <label
                        key={a.id}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2.5 transition-colors hover:border-border-strong"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-foreground">{a.name}</p>
                          <p className="tnum truncate text-xs text-soft-foreground">{a.id}</p>
                        </div>
                        <Switch
                          checked={a.active}
                          onCheckedChange={() => toggleAccount(p.id as AdProviderId, a.id)}
                        />
                      </label>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button size="sm" onClick={() => save(p, list)}>
                      <Check />
                      Salvar seleção
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-soft-foreground">
        OAuth e sincronização real serão religados ao backend.
      </p>

      <WhatsAppConnect
        open={waOpen}
        onClose={() => setWaOpen(false)}
        onConnected={(g) => {
          setConnected((s) => ({ ...s, whatsapp: true }));
          setWaGroups(g);
        }}
      />
    </>
  );
}
