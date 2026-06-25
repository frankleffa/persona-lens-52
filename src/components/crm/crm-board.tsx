"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer } from "@/components/ui/drawer";
import {
  stages,
  sourceVariant,
  type Lead,
  type Stage,
} from "./data";

const selectCls =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";
const owners = ["FL", "CA", "DM", "BL"];
const sources: Lead["source"][] = ["Indicação", "Meta", "Google", "Site", "Outbound"];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function CrmBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<Stage | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    supabase
      .from("crm_leads")
      .select("id, company, contact, value, source, owner, stage")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar os leads.");
          return;
        }
        setLeads((data ?? []) as Lead[]);
      });
  }, []);

  const stats = useMemo(() => {
    const total = leads.length;
    const open = leads.filter((l) => l.stage !== "ganho");
    const openValue = open.reduce((s, l) => s + l.value, 0);
    const won = leads.filter((l) => l.stage === "ganho").length;
    const rate = total ? Math.round((won / total) * 100) : 0;
    return { total, openValue, proposals: leads.filter((l) => l.stage === "proposta").length, rate };
  }, [leads]);

  function move(id: string, stage: Stage) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage } : l)));
    const label = stages.find((s) => s.key === stage)?.label;
    supabase
      .from("crm_leads")
      .update({ stage, updated_at: new Date().toISOString() })
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          toast.error("Falha ao mover o lead.");
          setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage: lead.stage } : l))); // reverte
        } else {
          toast.success(`${lead.company} → ${label}`);
        }
      });
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
        <Button onClick={() => setCreating(true)}>
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
        Seus leads são salvos automaticamente — arraste entre as etapas.
      </p>

      {creating && (
        <NewLeadDrawer
          onClose={() => setCreating(false)}
          onCreate={async (l) => {
            const { data, error } = await supabase
              .from("crm_leads")
              .insert({ company: l.company, contact: l.contact, value: l.value, source: l.source, owner: l.owner, stage: l.stage })
              .select("id, company, contact, value, source, owner, stage")
              .single();
            if (error || !data) {
              toast.error("Não foi possível adicionar o lead.");
              return;
            }
            setLeads((ls) => [data as Lead, ...ls]);
            toast.success(`Lead “${data.company}” adicionado ao funil.`);
            setCreating(false);
          }}
        />
      )}
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

function NewLeadDrawer({ onClose, onCreate }: { onClose: () => void; onCreate: (l: Lead) => void }) {
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");
  const [value, setValue] = useState("");
  const [source, setSource] = useState<Lead["source"]>("Indicação");
  const [owner, setOwner] = useState(owners[0]);
  const [stage, setStage] = useState<Stage>("novo");

  return (
    <Drawer
      open
      onClose={onClose}
      title="Novo lead"
      description="Adicione um potencial cliente ao seu funil."
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={company.trim().length < 2}
            onClick={() =>
              onCreate({
                id: `lead-${Date.now()}`,
                company: company.trim(),
                contact: contact.trim() || "—",
                value: Number(value) || 0,
                source,
                owner,
                stage,
              })
            }
          >
            Adicionar lead
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Empresa">
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Ex.: Studio Pilates Move" />
        </Field>
        <Field label="Contato">
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Nome do responsável" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Potencial mensal (R$)">
            <Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} placeholder="3500" />
          </Field>
          <Field label="Origem">
            <select className={selectCls} value={source} onChange={(e) => setSource(e.target.value as Lead["source"])}>
              {sources.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Responsável">
            <select className={selectCls} value={owner} onChange={(e) => setOwner(e.target.value)}>
              {owners.map((o) => <option key={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Etapa">
            <select className={selectCls} value={stage} onChange={(e) => setStage(e.target.value as Stage)}>
              {stages.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
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
