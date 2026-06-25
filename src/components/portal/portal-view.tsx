"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Download, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ThemeToggle } from "@/components/theme-toggle";
import { PortalChart } from "./portal-chart";
import { brl, healthMeta, type AgencyClient, type PortalData } from "@/components/agency/data";

const periods = ["Últimos 7 dias", "Últimos 30 dias", "Mês atual"];

export function PortalView({ client, data }: { client: AgencyClient; data: PortalData }) {
  const [period, setPeriod] = useState(periods[1]);
  const hm = healthMeta[client.health];

  return (
    <div className="min-h-screen bg-background">
      {/* Cabeçalho white-label */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              {initials(client.name)}
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{client.name}</h1>
              <p className="text-xs text-muted-foreground">Relatório de performance · {client.segment}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-9 rounded-md border border-border bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              {periods.map((p) => <option key={p}>{p}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={() => toast.success("Relatório PDF gerado.")}>
              <Download />
              PDF
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8 lg:px-8">
        {/* Faixa de status */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-2/40 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-primary-soft text-primary">
              <ShieldCheck className="size-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Sua operação está <span style={{ color: hm.bar }}>{hm.label.toLowerCase()}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Saúde da conta {client.score}/100 · atualizado {client.lastSync}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {client.platforms.map((p) => (
              <Badge key={p} variant={p === "Meta" ? "brand" : "neutral"}>{p}</Badge>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <section className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
          {data.kpis.map((k) => {
            const positive = k.invert ? k.delta < 0 : k.delta >= 0;
            const Arrow = k.delta >= 0 ? ArrowUp : ArrowDown;
            return (
              <Card key={k.label} className="p-5">
                <p className="eyebrow">{k.label}</p>
                <AnimatedNumber value={k.value} className="metric mt-3 block text-xl font-medium text-foreground" />
                <p className={cn("tnum mt-2 flex items-center gap-1 text-xs font-medium", positive ? "text-success" : "text-destructive")}>
                  <Arrow className="size-3" />
                  {Math.abs(k.delta).toFixed(1)}%
                </p>
              </Card>
            );
          })}
        </section>

        {/* Gráfico */}
        <Card className="mb-8 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Evolução</p>
              <h2 className="mt-1 text-base font-semibold text-foreground">Investimento × Resultado</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: "var(--muted-foreground)" }} />Investimento</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />Resultado</span>
            </div>
          </div>
          <PortalChart data={data.series} />
        </Card>

        {/* Campanhas */}
        <Card className="mb-8 overflow-hidden p-0">
          <div className="border-b border-border px-5 py-4">
            <p className="eyebrow">Destaques</p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Principais campanhas</h2>
          </div>
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-soft-foreground">
                  <th className="px-5 py-3 font-medium">Campanha</th>
                  <th className="px-3 py-3 text-right font-medium">Investido</th>
                  <th className="px-3 py-3 text-right font-medium">Resultados</th>
                  <th className="px-3 py-3 text-right font-medium">CPA</th>
                  <th className="px-5 py-3 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.name} className="border-b border-border/60 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={c.platform === "Meta" ? "brand" : "neutral"}>{c.platform}</Badge>
                        <span className="font-medium text-foreground">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tnum text-foreground">{brl(c.spend)}</td>
                    <td className="px-3 py-3 text-right tnum text-foreground">{c.results}</td>
                    <td className="px-3 py-3 text-right tnum text-foreground">{brl(Math.round(c.cpa))}</td>
                    <td className="px-5 py-3 text-right tnum font-medium text-foreground">{c.roas.toFixed(1)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Último relatório */}
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="text-sm font-medium text-foreground">Relatório completo — {data.lastReport.period}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Enviado {data.lastReport.sentAt} no WhatsApp.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => toast.success("Download iniciado.")}>
            <Download />
            Baixar relatório
          </Button>
        </Card>
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-soft-foreground">
          Portal fornecido por <span className="font-medium text-muted-foreground">AdScape</span> · dados ilustrativos
        </p>
      </footer>
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
