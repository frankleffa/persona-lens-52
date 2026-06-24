"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clients, statusMeta, type Client, type ClientStatus } from "./data";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const filters: { key: ClientStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "growing", label: "Crescendo" },
  { key: "stable", label: "Estável" },
  { key: "attention", label: "Atenção" },
  { key: "critical", label: "Crítico" },
];

export function ClientsView() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("all");

  const filtered = useMemo(
    () =>
      clients.filter(
        (c) =>
          (status === "all" || c.status === status) &&
          c.name.toLowerCase().includes(query.toLowerCase())
      ),
    [query, status]
  );

  const stats = useMemo(() => {
    const total = clients.length;
    const spend = clients.reduce((s, c) => s + c.spend, 0);
    const roas = clients.reduce((s, c) => s + c.roas, 0) / total;
    const alerts = clients.filter((c) => c.status === "attention" || c.status === "critical").length;
    return { total, spend, roas, alerts };
  }, []);

  return (
    <>
      {/* Cabeçalho */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Carteira</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie a saúde e o desempenho de cada conta da sua carteira.
          </p>
        </div>
        <Button onClick={() => toast("Cadastro de cliente — em breve")}>
          <Plus />
          Adicionar cliente
        </Button>
      </div>

      {/* Resumo */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Clientes ativos" value={String(stats.total)} />
        <Stat label="Investimento no mês" value={brl(stats.spend)} />
        <Stat label="ROAS médio" value={`${stats.roas.toFixed(1)}x`} />
        <Stat
          label="Precisam de atenção"
          value={String(stats.alerts)}
          accent={stats.alerts > 0 ? "warning" : undefined}
        />
      </section>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatus(f.key)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                status === f.key
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de clientes */}
      {filtered.length === 0 ? (
        <Card className="grid place-items-center p-12 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado para este filtro.
        </Card>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </section>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "warning";
}) {
  return (
    <Card className="p-5">
      <p className="eyebrow">{label}</p>
      <p
        className={cn(
          "metric mt-3 text-2xl font-medium",
          accent === "warning" ? "text-warning" : "text-foreground"
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function ClientCard({ client: c }: { client: Client }) {
  const meta = statusMeta[c.status];
  const up = c.delta >= 0;
  const Arrow = up ? ArrowUp : ArrowDown;

  return (
    <Card className="group flex flex-col p-5 transition-colors hover:border-border-strong">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-sm font-semibold text-foreground">
            {initials(c.name)}
          </div>
          <div>
            <p className="font-medium leading-tight text-foreground">{c.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{c.strategy}</p>
          </div>
        </div>
        <Badge variant={meta.variant} dot>
          {meta.label}
        </Badge>
      </div>

      {/* Saúde da conta */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Saúde da conta</span>
          <span className="tnum font-medium text-foreground">{c.score}/100</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full"
            style={{ width: `${c.score}%`, background: meta.bar }}
          />
        </div>
      </div>

      {/* Plataformas */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {c.platforms.map((p) => (
          <Badge key={p} variant={p === "Meta" ? "brand" : "neutral"}>
            {p}
          </Badge>
        ))}
      </div>

      {/* Métricas */}
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
        <Metric label="Investido" value={brl(c.spend)} />
        <Metric label="ROAS" value={`${c.roas.toFixed(1)}x`} />
        <div>
          <p className="eyebrow">Variação</p>
          <p
            className={cn(
              "tnum mt-1 flex items-center gap-1 text-sm font-medium",
              up ? "text-success" : "text-destructive"
            )}
          >
            <Arrow className="size-3" />
            {Math.abs(c.delta).toFixed(1)}%
          </p>
        </div>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
