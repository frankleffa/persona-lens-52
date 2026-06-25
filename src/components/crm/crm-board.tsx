"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  leads as seed,
  stages,
  sourceVariant,
  type Lead,
  type Stage,
} from "./data";

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function CrmBoard() {
  const [leads, setLeads] = useState<Lead[]>(seed);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);

  const stats = useMemo(() => {
    const total = leads.length;
    const open = leads.filter((l) => l.stage !== "ganho");
    const openValue = open.reduce((s, l) => s + l.value, 0);
    const won = leads.filter((l) => l.stage === "ganho").length;
    const rate = total ? Math.round((won / total) * 100) : 0;
    return { total, openValue, proposals: leads.filter((l) => l.stage === "proposta").length, rate };
  }, [leads]);

  function move(id: string, stage: Stage) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage } : l)));
    const lead = leads.find((l) => l.id === id);
    const label = stages.find((s) => s.key === stage)?.label;
    if (lead && lead.stage !== stage) toast.success(`${lead.company} → ${label}`);
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Relacionamento</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">CRM</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seu funil de novos clientes — arraste os leads entre as etapas.
          </p>
        </div>
        <Button onClick={() => toast("Cadastro de lead — em breve")}>
          <Plus />
          Novo lead
        </Button>
      </div>

      {/* Resumo */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Leads no funil" value={String(stats.total)} />
        <Stat label="Valor em aberto" value={brl(stats.openValue)} />
        <Stat label="Em proposta" value={String(stats.proposals)} />
        <Stat label="Taxa de conversão" value={`${stats.rate}%`} />
      </section>

      {/* Board */}
      <div className="flex gap-4 overflow-x-auto scroll-slim pb-2">
        {stages.map((s) => {
          const items = leads.filter((l) => l.stage === s.key);
          const colValue = items.reduce((sum, l) => sum + l.value, 0);
          return (
            <div
              key={s.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(s.key);
              }}
              onDragLeave={() => setOverStage((cur) => (cur === s.key ? null : cur))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                move(id, s.key);
                setOverStage(null);
                setDragging(null);
              }}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg border bg-surface-2/40 transition-colors",
                overStage === s.key ? "border-border-strong" : "border-border"
              )}
            >
              {/* header da coluna */}
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm font-medium text-foreground">{s.label}</span>
                  <span className="tnum text-xs text-soft-foreground">{items.length}</span>
                </div>
                <span className="tnum text-xs text-muted-foreground">{brl(colValue)}</span>
              </div>

              {/* cards */}
              <div className="flex min-h-24 flex-col gap-2 p-2">
                {items.map((l) => (
                  <Card
                    key={l.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", l.id);
                      setDragging(l.id);
                    }}
                    onDragEnd={() => setDragging(null)}
                    className={cn(
                      "cursor-grab p-3 transition-colors hover:border-border-strong active:cursor-grabbing",
                      dragging === l.id && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight text-foreground">
                        {l.company}
                      </p>
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted-foreground">
                        {l.owner}
                      </div>
                    </div>
                    <p className="mt-0.5 text-xs text-soft-foreground">{l.contact}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="tnum text-sm font-medium text-foreground">
                        {brl(l.value)}
                        <span className="text-xs font-normal text-soft-foreground">/mês</span>
                      </span>
                      <Badge variant={sourceVariant[l.source]}>{l.source}</Badge>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && (
                  <p className="px-2 py-6 text-center text-xs text-soft-foreground">
                    Solte um lead aqui
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Dados ilustrativos — leads e histórico serão persistidos no backend.
      </p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="eyebrow">{label}</p>
      <AnimatedNumber value={value} className="metric mt-3 block text-2xl font-medium text-foreground" />
    </Card>
  );
}
