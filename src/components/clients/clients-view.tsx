"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Search, Users } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import {
  statusMeta,
  type Client,
  type ClientStatus,
  type Platform,
  type Strategy,
} from "./data";

const CLIENT_COLS = "id,name,strategy,status,score,platforms,spend,roas,delta,lastSync:last_sync";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const selectCls =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";
const strategies: Strategy[] = ["Performance", "Branding", "Full Funnel", "Lead Gen", "E-commerce"];
const allPlatforms: Platform[] = ["Meta", "Google", "GA4"];

const filters: { key: ClientStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "growing", label: "Crescendo" },
  { key: "stable", label: "Estável" },
  { key: "attention", label: "Atenção" },
  { key: "critical", label: "Crítico" },
];

export function ClientsView() {
  const [list, setList] = useState<Client[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ClientStatus | "all">("all");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from("clients")
      .select(CLIENT_COLS)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar os clientes.");
          return;
        }
        setList((data ?? []) as Client[]);
      });
  }, []);

  const filtered = useMemo(
    () =>
      list.filter(
        (c) =>
          (status === "all" || c.status === status) &&
          c.name.toLowerCase().includes(query.toLowerCase())
      ),
    [list, query, status]
  );

  const stats = useMemo(() => {
    const total = list.length;
    const spend = list.reduce((s, c) => s + c.spend, 0);
    const roas = total ? list.reduce((s, c) => s + c.roas, 0) / total : 0;
    const alerts = list.filter((c) => c.status === "attention" || c.status === "critical").length;
    return { total, spend, roas, alerts };
  }, [list]);

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
        <Button onClick={() => setCreating(true)}>
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
        <EmptyState
          icon={Users}
          title="Nenhum cliente encontrado"
          description="Ajuste a busca ou os filtros para ver outros clientes da sua carteira."
        />
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </section>
      )}

      {creating && (
        <AddClientDrawer
          onClose={() => setCreating(false)}
          onCreate={async (c) => {
            const { data, error } = await supabase
              .from("clients")
              .insert({ name: c.name, strategy: c.strategy, status: c.status, score: c.score, platforms: c.platforms, spend: c.spend, roas: c.roas, delta: c.delta })
              .select(CLIENT_COLS)
              .single();
            if (error || !data) {
              toast.error("Não foi possível adicionar o cliente.");
              return;
            }
            setList((cs) => [data as Client, ...cs]);
            toast.success(`Cliente “${data.name}” adicionado à carteira.`);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function AddClientDrawer({ onClose, onCreate }: { onClose: () => void; onCreate: (c: Client) => void }) {
  const [name, setName] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("Performance");
  const [spend, setSpend] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(["Meta"]);

  function togglePlatform(p: Platform) {
    setPlatforms((ps) => (ps.includes(p) ? ps.filter((x) => x !== p) : [...ps, p]));
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title="Adicionar cliente"
      description="Cadastre uma nova conta na sua carteira."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={name.trim().length < 2 || platforms.length === 0}
            onClick={() =>
              onCreate({
                id: `client-${Date.now()}`,
                name: name.trim(),
                strategy,
                status: "stable",
                score: 70,
                platforms,
                spend: Number(spend) || 0,
                roas: 0,
                delta: 0,
                lastSync: "agora",
              })
            }
          >
            Adicionar cliente
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Nome do cliente">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Clínica Vitalis" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Estratégia">
            <select className={selectCls} value={strategy} onChange={(e) => setStrategy(e.target.value as Strategy)}>
              {strategies.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Investimento/mês (R$)">
            <Input type="number" min={0} value={spend} onChange={(e) => setSpend(e.target.value)} placeholder="15000" />
          </Field>
        </div>
        <Field label="Plataformas">
          <div className="flex flex-wrap gap-2">
            {allPlatforms.map((p) => {
              const on = platforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Field>
      </div>
    </Drawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
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
      <AnimatedNumber
        value={value}
        className={cn(
          "metric mt-3 block text-2xl font-medium",
          accent === "warning" ? "text-warning" : "text-foreground"
        )}
      />
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
    <Link
      href={`/clientes/${c.id}`}
      className="flex flex-col rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
    >
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
    </Link>
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
