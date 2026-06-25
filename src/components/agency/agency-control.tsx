"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Search,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Switch } from "@/components/ui/switch";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { EmptyState } from "@/components/ui/empty-state";
import {
  brl,
  healthMeta,
  portalMeta,
  type AgencyClient,
  type PortalAccess,
} from "./data";

type SortKey = "score" | "spend" | "roas" | "pendingTasks";

const AGENCY_COLS =
  "id,name,segment,manager,health:status,score,platforms,accounts,spend,roas,delta,pendingTasks:pending_tasks,portal,contactEmail:contact_email,lastSync:last_sync";

export function AgencyControl() {
  const [list, setList] = useState<AgencyClient[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [managing, setManaging] = useState<AgencyClient | null>(null);

  useEffect(() => {
    supabase
      .from("clients")
      .select(AGENCY_COLS)
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar a carteira.");
          return;
        }
        setList((data ?? []) as AgencyClient[]);
      });
  }, []);

  const stats = useMemo(() => {
    const total = list.length;
    const avgScore = total ? Math.round(list.reduce((s, c) => s + c.score, 0) / total) : 0;
    const accounts = list.reduce((s, c) => s + c.accounts, 0);
    const tasks = list.reduce((s, c) => s + c.pendingTasks, 0);
    const portals = list.filter((c) => c.portal === "ativo").length;
    return { total, avgScore, accounts, tasks, portals };
  }, [list]);

  const rows = useMemo(() => {
    const filtered = list.filter((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    return [...filtered].sort((a, b) => b[sort] - a[sort]);
  }, [list, query, sort]);

  function updatePortal(id: string, portal: PortalAccess) {
    setList((cs) => cs.map((c) => (c.id === id ? { ...c, portal } : c)));
    setManaging((m) => (m && m.id === id ? { ...m, portal } : m));
    supabase
      .from("clients")
      .update({ portal })
      .eq("id", id)
      .then(({ error }) => {
        if (error) toast.error("Não foi possível atualizar o acesso ao portal.");
      });
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Visão da agência</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Central de controle
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranking de saúde da carteira, acessos ao portal e fila de otimizações — tudo em um lugar.
          </p>
        </div>
      </div>

      {/* Resumo */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Saúde média da carteira" value={`${stats.avgScore}/100`} />
        <Stat label="Contas conectadas" value={String(stats.accounts)} />
        <Stat label="Portais ativos" value={`${stats.portals}/${stats.total}`} />
        <Stat
          label="Otimizações na fila"
          value={String(stats.tasks)}
          accent={stats.tasks > 0 ? "warning" : undefined}
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
          {([
            { key: "score", label: "Saúde" },
            { key: "spend", label: "Investimento" },
            { key: "roas", label: "ROAS" },
            { key: "pendingTasks", label: "Otimizações" },
          ] as { key: SortKey; label: string }[]).map((s) => (
            <button
              key={s.key}
              onClick={() => setSort(s.key)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                sort === s.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela / ranking */}
      {rows.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum cliente encontrado"
          description="Ajuste a busca para ver outros clientes da carteira."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th className="w-10 pl-5">#</Th>
                  <Th>Cliente</Th>
                  <Th>Saúde</Th>
                  <Th>Contas</Th>
                  <Th className="text-right">Investimento</Th>
                  <Th className="text-right">ROAS</Th>
                  <Th className="text-center">Otimizações</Th>
                  <Th>Portal</Th>
                  <Th className="pr-5 text-right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => {
                  const hm = healthMeta[c.health];
                  const pm = portalMeta[c.portal];
                  const up = c.delta >= 0;
                  const Arrow = up ? ArrowUp : ArrowDown;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/50"
                    >
                      <td className="py-3 pl-5 tnum text-soft-foreground">{i + 1}</td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-semibold text-foreground">
                            {initials(c.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground">{c.name}</p>
                            <p className="text-xs text-soft-foreground">
                              {c.segment} · Gestor {c.manager}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1.5">
                          <Badge variant={hm.variant} dot>{hm.label}</Badge>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                              <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: hm.bar }} />
                            </div>
                            <span className="tnum text-xs text-muted-foreground">{c.score}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {c.platforms.map((p) => (
                            <Badge key={p} variant={p === "Meta" ? "brand" : "neutral"}>{p}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <span className="tnum font-medium text-foreground">{brl(c.spend)}</span>
                        <span className={cn("tnum mt-0.5 flex items-center justify-end gap-1 text-xs", up ? "text-success" : "text-destructive")}>
                          <Arrow className="size-3" />
                          {Math.abs(c.delta).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-right tnum font-medium text-foreground">{c.roas.toFixed(1)}x</td>
                      <td className="py-3 pr-3 text-center">
                        {c.pendingTasks > 0 ? (
                          <Badge variant={c.pendingTasks >= 3 ? "danger" : "warning"}>{c.pendingTasks}</Badge>
                        ) : (
                          <span className="text-xs text-soft-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge variant={pm.variant}>{pm.label}</Badge>
                      </td>
                      <td className="py-3 pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" title="Abrir portal do cliente">
                            <Link href={`/portal/${c.id}`} target="_blank">
                              <ExternalLink />
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setManaging(c)}>
                            <Settings2 />
                            Gerenciar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Dados ilustrativos — ranking e acessos serão calculados pelo backend (sync-daily-metrics, manage-clients).
      </p>

      {managing && (
        <ManageDrawer
          client={managing}
          onClose={() => setManaging(null)}
          onPortalChange={(portal) => {
            updatePortal(managing.id, portal);
            toast.success(
              portal === "ativo"
                ? `Portal de ${managing.name} ativado.`
                : portal === "convidado"
                  ? `Convite reenviado para ${managing.name}.`
                  : `Acesso de ${managing.name} revogado.`
            );
          }}
        />
      )}
    </>
  );
}

function ManageDrawer({
  client,
  onClose,
  onPortalChange,
}: {
  client: AgencyClient;
  onClose: () => void;
  onPortalChange: (portal: PortalAccess) => void;
}) {
  const [accounts, setAccounts] = useState({ meta: true, google: true, ga4: client.platforms.includes("GA4") });
  const active = client.portal === "ativo";

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Gerenciar — ${client.name}`}
      description="Controle o acesso ao portal e quais contas o cliente enxerga."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button asChild>
            <Link href={`/portal/${client.id}`} target="_blank">
              <ExternalLink />
              Ver portal
            </Link>
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <section>
          <p className="eyebrow mb-3">Acesso ao portal</p>
          <Card className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">
                {active ? "Portal ativo" : "Portal desativado"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {active
                  ? `Liberado para ${client.contactEmail}`
                  : "O cliente não consegue acessar o portal."}
              </p>
            </div>
            <Switch checked={active} onCheckedChange={(v) => onPortalChange(v ? "ativo" : "sem-acesso")} />
          </Card>
          {client.portal !== "ativo" && (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => onPortalChange("convidado")}>
              Reenviar convite por e-mail
            </Button>
          )}
        </section>

        <section>
          <p className="eyebrow mb-3">Contas visíveis no portal</p>
          <div className="flex flex-col gap-2">
            <AccountRow label="Meta Ads" sub="2 contas de anúncio" checked={accounts.meta} onChange={(v) => setAccounts((a) => ({ ...a, meta: v }))} />
            <AccountRow label="Google Ads" sub="1 conta de anúncio" checked={accounts.google} onChange={(v) => setAccounts((a) => ({ ...a, google: v }))} />
            <AccountRow label="Google Analytics 4" sub="Propriedade principal" checked={accounts.ga4} onChange={(v) => setAccounts((a) => ({ ...a, ga4: v }))} />
          </div>
        </section>

        <section>
          <p className="eyebrow mb-3">Resumo</p>
          <Card className="grid grid-cols-2 gap-4 p-4">
            <Mini label="Saúde" value={`${client.score}/100`} />
            <Mini label="ROAS" value={`${client.roas.toFixed(1)}x`} />
            <Mini label="Investimento/mês" value={brl(client.spend)} />
            <Mini label="Otimizações" value={String(client.pendingTasks)} />
          </Card>
        </section>
      </div>
    </Drawer>
  );
}

function AccountRow({ label, sub, checked, onChange }: { label: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-soft-foreground">{sub}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="eyebrow">{label}</p>
      <p className="tnum mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "warning" }) {
  return (
    <Card className="p-5">
      <p className="eyebrow">{label}</p>
      <AnimatedNumber
        value={value}
        className={cn("metric mt-3 block text-2xl font-medium", accent === "warning" ? "text-warning" : "text-foreground")}
      />
    </Card>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-3 text-xs font-medium uppercase tracking-wide text-soft-foreground", className)}>{children}</th>;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
