"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, GripVertical, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ReportDocument } from "./report-document";
import { allSections, templates } from "./data";

const selectCls =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";
const clientList = ["Bella Estética", "Clínica Vitalis", "Loja Norte Calçados", "TechParts B2B", "EduPro Cursos"];
const accents = [
  { name: "AdScape", v: "#1c9cf0" },
  { name: "Navy", v: "#003676" },
  { name: "Verde", v: "#16a34a" },
  { name: "Roxo", v: "#7c5cff" },
  { name: "Âmbar", v: "#f7931a" },
  { name: "Rosa", v: "#e11d74" },
];

type Sec = { name: string; on: boolean };

export function ReportEditor() {
  const router = useRouter();
  const params = useSearchParams();
  const template = templates.find((t) => t.id === params.get("template"));

  const [name, setName] = useState(template ? `Relatório — ${template.name}` : "Novo relatório");
  const [client, setClient] = useState(clientList[0]);
  const [period, setPeriod] = useState("7d");
  const [accent, setAccent] = useState(accents[0].v);
  const [whiteLabel, setWhiteLabel] = useState(true);
  const [sections, setSections] = useState<Sec[]>(
    allSections.map((s) => ({ name: s, on: template ? template.sections.includes(s) : ["Resumo (KPIs)", "Gráfico de desempenho", "Campanhas"].includes(s) }))
  );
  const [drag, setDrag] = useState<number | null>(null);

  const enabled = sections.filter((s) => s.on).map((s) => s.name);
  const brandName = whiteLabel ? client : "AdScape";
  const periodLabel = period === "30d" ? "01–30 de junho, 2026" : period === "mes" ? "junho, 2026" : "01–07 de junho, 2026";

  function toggle(i: number) {
    setSections((s) => s.map((x, idx) => (idx === i ? { ...x, on: !x.on } : x)));
  }
  function reorder(from: number, to: number) {
    setSections((s) => {
      const next = [...s];
      const [m] = next.splice(from, 1);
      next.splice(to, 0, m);
      return next;
    });
  }

  return (
    <>
      <Link href="/relatorios" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Relatórios
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Editor</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Editor de relatório</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { toast.success("Relatório salvo."); }}>
            <Save />
            Salvar
          </Button>
          <Button onClick={() => { toast.success("Relatório salvo e agendamento aberto."); router.push("/relatorios"); }}>
            <Send />
            Salvar e agendar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        {/* Painel de configuração */}
        <div className="flex flex-col gap-6">
          <Field label="Nome do relatório">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente">
              <select className={selectCls} value={client} onChange={(e) => setClient(e.target.value)}>
                {clientList.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Período">
              <select className={selectCls} value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="7d">Últimos 7 dias</option>
                <option value="30d">Últimos 30 dias</option>
                <option value="mes">Mês atual</option>
              </select>
            </Field>
          </div>

          <Field label="Cor da marca">
            <div className="flex flex-wrap gap-2">
              {accents.map((a) => (
                <button
                  key={a.v}
                  onClick={() => setAccent(a.v)}
                  title={a.name}
                  className={cn("size-7 rounded-full ring-2 ring-offset-2 ring-offset-background transition-all", accent === a.v ? "ring-foreground" : "ring-transparent")}
                  style={{ background: a.v }}
                />
              ))}
            </div>
          </Field>

          <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
            <div>
              <p className="text-sm text-foreground">White-label</p>
              <p className="text-xs text-soft-foreground">Marca do cliente no relatório</p>
            </div>
            <Switch checked={whiteLabel} onCheckedChange={setWhiteLabel} />
          </div>

          {/* Seções reordenáveis */}
          <div>
            <p className="eyebrow mb-2">Seções (arraste para reordenar)</p>
            <div className="flex flex-col gap-1.5">
              {sections.map((s, i) => (
                <div
                  key={s.name}
                  draggable
                  onDragStart={() => setDrag(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => { if (drag !== null && drag !== i) reorder(drag, i); setDrag(null); }}
                  className={cn(
                    "flex items-center gap-2 rounded-md border bg-surface px-2.5 py-2 transition-colors",
                    drag === i ? "border-primary opacity-60" : "border-border hover:border-border-strong"
                  )}
                >
                  <GripVertical className="size-4 cursor-grab text-soft-foreground" />
                  <span className={cn("flex-1 text-sm", s.on ? "text-foreground" : "text-soft-foreground line-through")}>{s.name}</span>
                  <Switch checked={s.on} onCheckedChange={() => toggle(i)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview ao vivo */}
        <div>
          <p className="eyebrow mb-3">Pré-visualização</p>
          <ReportDocument sections={enabled} brandName={brandName} accent={accent} period={periodLabel} />
        </div>
      </div>
    </>
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
