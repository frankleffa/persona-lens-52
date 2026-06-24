"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Pause, Play, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  campaigns as seed,
  statusMeta,
  type Campaign,
  type CampaignStatus,
  type Platform,
} from "./data";

const brl = (v: number, max = 0) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: max });
const num = (v: number) => v.toLocaleString("pt-BR");

const platformFilters: { key: Platform | "all"; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "Meta", label: "Meta" },
  { key: "Google", label: "Google" },
];
const statusFilters: { key: CampaignStatus | "all"; label: string }[] = [
  { key: "all", label: "Todos status" },
  { key: "ativa", label: "Ativas" },
  { key: "limitada", label: "Limitadas" },
  { key: "pausada", label: "Pausadas" },
];

export function CampaignsView() {
  const [rows, setRows] = useState<Campaign[]>(seed);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState<Platform | "all">("all");
  const [status, setStatus] = useState<CampaignStatus | "all">("all");

  const filtered = useMemo(
    () =>
      rows.filter(
        (c) =>
          (platform === "all" || c.platform === platform) &&
          (status === "all" || c.status === status) &&
          (c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.client.toLowerCase().includes(query.toLowerCase()))
      ),
    [rows, query, platform, status]
  );

  const stats = useMemo(() => {
    const spend = rows.reduce((s, c) => s + c.spend, 0);
    const conv = rows.reduce((s, c) => s + c.conversions, 0);
    const roas = rows.reduce((s, c) => s + c.roas, 0) / rows.length;
    const active = rows.filter((c) => c.status === "ativa").length;
    return { spend, conv, roas, active };
  }, [rows]);

  function toggleStatus(c: Campaign) {
    const next: CampaignStatus = c.status === "ativa" ? "pausada" : "ativa";
    setRows((r) => r.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
    toast.success(`${c.name} ${next === "ativa" ? "ativada" : "pausada"}.`);
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Campanhas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe e gerencie todas as campanhas da sua carteira.
          </p>
        </div>
        <Button onClick={() => toast("Criação de campanha — em breve")}>
          <Plus />
          Nova campanha
        </Button>
      </div>

      {/* Resumo */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Investimento" value={brl(stats.spend)} />
        <Stat label="Conversões" value={num(stats.conv)} />
        <Stat label="ROAS médio" value={`${stats.roas.toFixed(1)}x`} />
        <Stat label="Campanhas ativas" value={`${stats.active}/${rows.length}`} />
      </section>

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar campanha ou cliente…"
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <Segmented options={platformFilters} value={platform} onChange={setPlatform} />
        <Segmented options={statusFilters} value={status} onChange={setStatus} />
      </div>

      {/* Tabela */}
      <Card className="p-0">
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Campanha", "Plataforma", "Status", "Invest.", "Impr.", "CTR", "Conv.", "CPA", "ROAS", "Δ", ""].map(
                  (h, i) => (
                    <th
                      key={h + i}
                      className={cn("eyebrow px-3 py-3 font-medium", i >= 3 && i <= 9 && "text-right")}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const sm = statusMeta[c.status];
                const up = c.delta >= 0;
                const Arrow = up ? ArrowUp : ArrowDown;
                return (
                  <tr key={c.id} className="border-b border-border/60 transition-colors hover:bg-surface-2/50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-foreground">{c.name}</p>
                      <p className="text-xs text-soft-foreground">{c.client} · {c.objective}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={c.platform === "Meta" ? "brand" : "neutral"}>{c.platform}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={sm.variant} dot>{sm.label}</Badge>
                    </td>
                    <td className="tnum px-3 py-3 text-right text-muted-foreground">{brl(c.spend)}</td>
                    <td className="tnum px-3 py-3 text-right text-muted-foreground">{num(c.impressions)}</td>
                    <td className="tnum px-3 py-3 text-right text-muted-foreground">{c.ctr.toFixed(1)}%</td>
                    <td className="tnum px-3 py-3 text-right text-muted-foreground">{num(c.conversions)}</td>
                    <td className="tnum px-3 py-3 text-right text-muted-foreground">{brl(c.cpa, 2)}</td>
                    <td className="tnum px-3 py-3 text-right font-medium text-foreground">{c.roas.toFixed(1)}x</td>
                    <td className="px-3 py-3">
                      <span className={cn("tnum flex items-center justify-end gap-1 font-medium", up ? "text-success" : "text-destructive")}>
                        <Arrow className="size-3" />
                        {Math.abs(c.delta).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={() => toggleStatus(c)}
                        aria-label={c.status === "ativa" ? "Pausar" : "Ativar"}
                        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                      >
                        {c.status === "ativa" ? <Pause className="size-4" /> : <Play className="size-4" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-sm text-muted-foreground">
                    Nenhuma campanha encontrada para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Dados ilustrativos — as ações reais (pausar, orçamento) serão religadas ao backend.
      </p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="eyebrow">{label}</p>
      <p className="metric mt-3 text-2xl font-medium text-foreground">{value}</p>
    </Card>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.key ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
