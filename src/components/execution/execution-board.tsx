"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import {
  columns,
  priorityMeta,
  tasks as seed,
  typeVariant,
  type Priority,
  type Status,
  type Task,
  type TaskType,
} from "./data";

const selectCls =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";
const clientList = ["Bella Estética", "Clínica Vitalis", "Loja Norte Calçados", "TechParts B2B", "EduPro Cursos", "Sabor & Cia Delivery"];
const team = ["FL", "CA", "DM", "BL"];

export function ExecutionBoard() {
  const [tasks, setTasks] = useState<Task[]>(seed);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [creating, setCreating] = useState(false);

  const stats = useMemo(() => {
    const open = tasks.filter((t) => t.status !== "done").length;
    const overdue = tasks.filter((t) => t.overdue && t.status !== "done").length;
    const review = tasks.filter((t) => t.status === "review").length;
    const done = tasks.filter((t) => t.status === "done").length;
    return { open, overdue, review, done };
  }, [tasks]);

  function move(id: string, status: Status) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status, done: status === "done", overdue: status === "done" ? false : t.overdue } : t)));
    const t = tasks.find((x) => x.id === id);
    const label = columns.find((c) => c.key === status)?.label;
    if (t && t.status !== status) toast.success(`“${t.title}” → ${label}`);
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Operação</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Execução</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tarefas e otimizações da equipe — arraste entre as colunas.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus />
          Nova tarefa
        </Button>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Tarefas abertas" value={String(stats.open)} />
        <Stat label="Atrasadas" value={String(stats.overdue)} accent={stats.overdue > 0 ? "danger" : undefined} />
        <Stat label="Em revisão" value={String(stats.review)} />
        <Stat label="Concluídas" value={String(stats.done)} />
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((col) => {
          const items = tasks.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              onDragOver={(e) => { e.preventDefault(); setOver(col.key); }}
              onDragLeave={() => setOver((c) => (c === col.key ? null : c))}
              onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); move(id, col.key); setOver(null); setDragging(null); }}
              className={cn(
                "flex flex-col rounded-lg border bg-surface-2/40 transition-colors",
                over === col.key ? "border-border-strong" : "border-border"
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-sm font-medium text-foreground">{col.label}</span>
                  <span className="tnum text-xs text-soft-foreground">{items.length}</span>
                </div>
              </div>

              <div className="flex min-h-24 flex-col gap-2 p-2">
                {items.map((t) => (
                  <Card
                    key={t.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); setDragging(t.id); }}
                    onDragEnd={() => setDragging(null)}
                    className={cn("cursor-grab p-3 transition-colors hover:border-border-strong active:cursor-grabbing", dragging === t.id && "opacity-50")}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-1 size-2 shrink-0 rounded-full" style={{ background: priorityMeta[t.priority].color }} title={`Prioridade ${priorityMeta[t.priority].label}`} />
                      <p className={cn("text-sm font-medium leading-snug", t.done ? "text-muted-foreground line-through" : "text-foreground")}>
                        {t.title}
                      </p>
                    </div>
                    <p className="mt-1.5 pl-4 text-xs text-soft-foreground">{t.client}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 pl-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={typeVariant[t.type]}>{t.type}</Badge>
                        <span className={cn("flex items-center gap-1 text-xs", t.overdue && !t.done ? "text-destructive" : "text-soft-foreground")}>
                          <CalendarClock className="size-3.5" />
                          {t.due}
                        </span>
                      </div>
                      <div className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold text-muted-foreground">
                        {t.assignee}
                      </div>
                    </div>
                  </Card>
                ))}
                {items.length === 0 && <p className="px-2 py-6 text-center text-xs text-soft-foreground">Solte uma tarefa aqui</p>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Tarefas e comentários serão persistidos no backend.
      </p>

      {creating && (
        <NewTaskDrawer
          onClose={() => setCreating(false)}
          onCreate={(t) => {
            setTasks((ts) => [...ts, t]);
            toast.success(`Tarefa “${t.title}” criada.`);
            setCreating(false);
          }}
        />
      )}
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: "danger" }) {
  return (
    <Card className="p-5">
      <p className="eyebrow">{label}</p>
      <p className={cn("metric mt-3 text-2xl font-medium", accent === "danger" ? "text-destructive" : "text-foreground")}>{value}</p>
    </Card>
  );
}

function NewTaskDrawer({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Task) => void }) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState(clientList[0]);
  const [type, setType] = useState<TaskType>("Otimização");
  const [priority, setPriority] = useState<Priority>("media");
  const [assignee, setAssignee] = useState(team[0]);
  const [due, setDue] = useState("");
  const [status, setStatus] = useState<Status>("todo");

  return (
    <Drawer
      open
      onClose={onClose}
      title="Nova tarefa"
      description="Crie uma tarefa ou otimização para a equipe."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={title.trim().length < 3}
            onClick={() =>
              onCreate({
                id: `t-${Date.now()}`,
                title, client, type, priority, assignee,
                due: due || "Sem prazo",
                status,
                done: status === "done",
              })
            }
          >
            Criar tarefa
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Título">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Reduzir CPA da campanha X" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cliente">
            <select className={selectCls} value={client} onChange={(e) => setClient(e.target.value)}>
              {clientList.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Tipo">
            <select className={selectCls} value={type} onChange={(e) => setType(e.target.value as TaskType)}>
              {(Object.keys(typeVariant) as TaskType[]).map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prioridade">
            <select className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </Field>
          <Field label="Responsável">
            <select className={selectCls} value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {team.map((m) => <option key={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prazo">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className={selectCls} />
          </Field>
          <Field label="Coluna">
            <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {columns.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </Field>
        </div>
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
