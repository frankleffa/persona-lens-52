"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Eye,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import { ReportPreview } from "./report-preview";
import { allSections, freqMeta, reports as seed, type Freq, type Report } from "./data";

const selectCls =
  "h-9 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";
const clientList = ["Bella Estética", "Clínica Vitalis", "Loja Norte Calçados", "TechParts B2B", "EduPro Cursos"];

export function ReportsView() {
  const [reports, setReports] = useState<Report[]>(seed);
  const [edit, setEdit] = useState<Report | null>(null);
  const [creating, setCreating] = useState(false);
  const [preview, setPreview] = useState<Report | null>(null);

  const active = reports.filter((r) => r.status === "ativo").length;

  function toggleStatus(r: Report) {
    setReports((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: x.status === "ativo" ? "pausado" : "ativo" } : x)));
    toast(`Relatório de ${r.client} ${r.status === "ativo" ? "pausado" : "ativado"}.`);
  }
  function sendNow(r: Report) {
    toast.success(`Relatório de ${r.client} enviado para ${r.whatsapp}.`);
  }
  function remove(r: Report) {
    setReports((rs) => rs.filter((x) => x.id !== r.id));
    toast(`Relatório de ${r.client} excluído.`);
  }
  function save(r: Report) {
    setReports((rs) => (rs.some((x) => x.id === r.id) ? rs.map((x) => (x.id === r.id ? r : x)) : [...rs, r]));
    toast.success(`Relatório de ${r.client} salvo.`);
    setEdit(null);
    setCreating(false);
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Relatórios</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Relatórios automáticos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relatórios agendados e enviados no WhatsApp dos seus clientes.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          Novo relatório
        </Button>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Relatórios ativos" value={String(active)} />
        <Stat label="Enviados no mês" value="128" />
        <Stat label="Próximos 7 dias" value={String(active)} />
        <Stat label="Taxa de entrega" value="99%" />
      </section>

      <div className="flex flex-col gap-3">
        {reports.map((r) => (
          <ReportCard
            key={r.id}
            r={r}
            onPreview={() => setPreview(r)}
            onSend={() => sendNow(r)}
            onEdit={() => setEdit(r)}
            onToggle={() => toggleStatus(r)}
            onRemove={() => remove(r)}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Geração e disparo no WhatsApp serão religados ao backend.
      </p>

      {(edit || creating) && (
        <ConfigDrawer
          report={edit}
          onClose={() => { setEdit(null); setCreating(false); }}
          onSave={save}
        />
      )}

      <Drawer open={!!preview} onClose={() => setPreview(null)} title="Pré-visualização do WhatsApp" description={preview?.client}>
        {preview && <ReportPreview report={preview} />}
      </Drawer>
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

function ReportCard({
  r,
  onPreview,
  onSend,
  onEdit,
  onToggle,
  onRemove,
}: {
  r: Report;
  onPreview: () => void;
  onSend: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-surface-2 text-sm font-semibold text-foreground">
          {r.client.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-foreground">{r.client}</p>
            {r.whiteLabel && <Badge variant="brand">White-label</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {freqMeta[r.freq]} · {r.day} às {r.time} · {r.sections.length} seções
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex items-center gap-1.5 text-xs">
          <MessageCircle className="size-4 text-success" />
          <span className="text-foreground">{r.whatsapp}</span>
        </div>
        <div className="text-xs">
          <span className="text-soft-foreground">Próximo: </span>
          <span className="font-medium text-foreground">{r.nextSend}</span>
        </div>
        <Badge variant={r.status === "ativo" ? "success" : "neutral"} dot>
          {r.status === "ativo" ? "Ativo" : "Pausado"}
        </Badge>
      </div>

      <div className="flex items-center gap-1.5 lg:ml-2">
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye />
          Prévia
        </Button>
        <Button size="sm" onClick={onSend}>
          <Send />
          Enviar agora
        </Button>
        <Dropdown
          align="right"
          panelClass="w-40"
          trigger={
            <span className="grid size-9 place-items-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground">
              <MoreHorizontal className="size-4" />
            </span>
          }
        >
          {(close) => (
            <>
              <MenuRow icon={<Pencil className="size-4" />} onClick={() => { onEdit(); close(); }}>Editar</MenuRow>
              <MenuRow
                icon={r.status === "ativo" ? <Pause className="size-4" /> : <Play className="size-4" />}
                onClick={() => { onToggle(); close(); }}
              >
                {r.status === "ativo" ? "Pausar" : "Ativar"}
              </MenuRow>
              <MenuRow icon={<Trash2 className="size-4" />} danger onClick={() => { onRemove(); close(); }}>Excluir</MenuRow>
            </>
          )}
        </Dropdown>
      </div>
    </Card>
  );
}

function ConfigDrawer({ report, onClose, onSave }: { report: Report | null; onClose: () => void; onSave: (r: Report) => void }) {
  const [client, setClient] = useState(report?.client ?? clientList[0]);
  const [freq, setFreq] = useState<Freq>(report?.freq ?? "semanal");
  const [day, setDay] = useState(report?.day ?? "Toda segunda");
  const [time, setTime] = useState(report?.time ?? "08:00");
  const [whatsapp, setWhatsapp] = useState(report?.whatsapp ?? "");
  const [sections, setSections] = useState<string[]>(report?.sections ?? ["Resumo (KPIs)", "Gráfico de desempenho", "Campanhas"]);
  const [whiteLabel, setWhiteLabel] = useState(report?.whiteLabel ?? true);

  const dayOptions =
    freq === "diario" ? ["Todo dia"] : freq === "semanal"
      ? ["Toda segunda", "Toda terça", "Toda quarta", "Toda quinta", "Toda sexta"]
      : ["Dia 1", "Dia 5", "Dia 10", "Último dia"];

  function toggleSection(s: string) {
    setSections((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={report ? "Editar relatório" : "Novo relatório"}
      description="Configure o conteúdo e o envio no WhatsApp."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={!whatsapp.trim()}
            onClick={() =>
              onSave({
                id: report?.id ?? `r-${Date.now()}`,
                client, freq, day: dayOptions.includes(day) ? day : dayOptions[0], time, whatsapp,
                status: report?.status ?? "ativo",
                sections,
                lastSent: report?.lastSent ?? "—",
                nextSend: freq === "diario" ? `Amanhã, ${time}` : `${day}, ${time}`,
                whiteLabel,
              })
            }
          >
            Salvar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <DField label="Cliente">
          <select className={selectCls} value={client} onChange={(e) => setClient(e.target.value)}>
            {clientList.map((c) => <option key={c}>{c}</option>)}
          </select>
        </DField>

        <DField label="Frequência">
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
            {(["diario", "semanal", "mensal"] as Freq[]).map((k) => (
              <button
                key={k}
                onClick={() => { setFreq(k); }}
                className={cn("flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors", freq === k ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground")}
              >
                {freqMeta[k]}
              </button>
            ))}
          </div>
        </DField>

        <div className="grid grid-cols-2 gap-3">
          <DField label="Quando">
            <select className={selectCls} value={dayOptions.includes(day) ? day : dayOptions[0]} onChange={(e) => setDay(e.target.value)}>
              {dayOptions.map((d) => <option key={d}>{d}</option>)}
            </select>
          </DField>
          <DField label="Horário">
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={selectCls} />
          </DField>
        </div>

        <DField label="WhatsApp de destino">
          <div className="flex h-10 items-center rounded-md border border-input bg-surface focus-within:border-border-strong focus-within:ring-2 focus-within:ring-ring/40">
            <MessageCircle className="ml-3 size-4 text-success" />
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+55 11 9..., ou nome do grupo"
              className="h-full w-full bg-transparent px-2.5 text-sm text-foreground placeholder:text-soft-foreground focus:outline-none"
            />
          </div>
        </DField>

        <div>
          <p className="eyebrow mb-2">Seções do relatório</p>
          <div className="flex flex-col gap-1.5">
            {allSections.map((s) => (
              <button key={s} onClick={() => toggleSection(s)} className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-left text-sm text-foreground hover:bg-surface-2">
                <span className={cn("grid size-4 place-items-center rounded border transition-colors", sections.includes(s) ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface")}>
                  {sections.includes(s) && <Check className="size-3" strokeWidth={3} />}
                </span>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
          <div>
            <p className="text-sm text-foreground">White-label</p>
            <p className="text-xs text-soft-foreground">Usar a marca do cliente no relatório</p>
          </div>
          <Switch checked={whiteLabel} onCheckedChange={setWhiteLabel} />
        </div>
      </div>
    </Drawer>
  );
}

/* ── helpers ── */

function DField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function MenuRow({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2", danger ? "text-destructive" : "text-foreground")}>
      {icon}
      {children}
    </button>
  );
}

function Dropdown({ trigger, children, align = "left", panelClass }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; panelClass?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className={cn("absolute z-50 mt-1 min-w-40 rounded-md border border-border bg-popover p-1 shadow-xl", align === "right" ? "right-0" : "left-0", panelClass)}>
            {children(close)}
          </div>
        </>
      )}
    </div>
  );
}
