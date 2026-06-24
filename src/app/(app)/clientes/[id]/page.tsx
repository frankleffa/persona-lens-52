import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { CampaignsTable } from "@/components/dashboard/campaigns-table";
import type { Kpi } from "@/components/dashboard/data";
import {
  clients,
  getClient,
  recommendation,
  statusMeta,
} from "@/components/clients/data";
import { ClientActions } from "@/components/clients/client-actions";

export function generateStaticParams() {
  return clients.map((c) => ({ id: c.id }));
}

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = getClient(id);
  if (!c) notFound();

  const meta = statusMeta[c.status];
  const src = c.platforms[0];
  const receita = Math.round(c.spend * c.roas);
  const conversoes = Math.max(1, Math.round(c.spend / 55));
  const cpa = c.spend / conversoes;
  const leads = Math.round(conversoes * 1.6);

  const kpis: Kpi[] = [
    { key: "spend", label: "Investido", value: brl(c.spend), delta: c.delta, source: src },
    { key: "revenue", label: "Receita", value: brl(receita), delta: +(c.delta * 1.3).toFixed(1), source: "GA4" },
    { key: "roas", label: "ROAS", value: `${c.roas.toFixed(1)}x`, delta: +(c.delta * 0.6).toFixed(1), source: "GA4" },
    { key: "conv", label: "Conversões", value: String(conversoes), delta: +(c.delta * 0.9).toFixed(1), source: src },
    { key: "cpa", label: "CPA", value: brl(cpa), delta: +(-c.delta * 0.5).toFixed(1), invert: true, source: src },
    { key: "leads", label: "Leads", value: String(leads), delta: +(c.delta * 1.1).toFixed(1), source: src },
  ];

  return (
    <>
      <Link
        href="/clientes"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clientes
      </Link>

      {/* Cabeçalho do cliente */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-surface-2 text-lg font-semibold text-foreground">
            {initials(c.name)}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {c.name}
              </h1>
              <Badge variant={meta.variant} dot>
                {meta.label}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {c.strategy} · sincronizado {c.lastSync}
            </p>
          </div>
        </div>
        <ClientActions />
      </div>

      {/* KPIs do cliente */}
      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </section>

      {/* Performance + saúde/contas */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4">
            <p className="eyebrow">Desempenho</p>
            <h2 className="mt-1 text-sm font-medium text-foreground">
              Investimento × Receita
            </h2>
          </div>
          <OverviewChart />
        </Card>

        <div className="flex flex-col gap-4">
          {/* Saúde da conta */}
          <Card className="p-5">
            <p className="eyebrow">Saúde da conta</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="metric text-3xl font-medium text-foreground">{c.score}</span>
              <span className="mb-1 text-xs text-soft-foreground">/100</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: `${c.score}%`, background: meta.bar }}
              />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{recommendation[c.status]}</p>
          </Card>

          {/* Contas conectadas */}
          <Card className="p-5">
            <p className="eyebrow mb-3">Contas conectadas</p>
            <div className="flex flex-col gap-2.5">
              {(["Meta", "Google", "GA4"] as const).map((p) => {
                const on = c.platforms.includes(p);
                return (
                  <div key={p} className="flex items-center justify-between text-sm">
                    <span className={on ? "text-foreground" : "text-soft-foreground"}>{p}</span>
                    {on ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                        <Check className="size-3.5" /> conectado
                      </span>
                    ) : (
                      <span className="text-xs text-soft-foreground">não conectado</span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </section>

      {/* Campanhas do cliente */}
      <Card className="p-5">
        <div className="mb-4">
          <p className="eyebrow">Campanhas</p>
          <h2 className="mt-1 text-sm font-medium text-foreground">Campanhas ativas</h2>
        </div>
        <CampaignsTable />
      </Card>

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Dados ilustrativos — serão preenchidos pelo backend.
      </p>
    </>
  );
}
