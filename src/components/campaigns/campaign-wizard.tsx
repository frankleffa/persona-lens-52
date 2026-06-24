"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Eye,
  Heart,
  ImageIcon,
  Images,
  MessageCircle,
  MousePointerClick,
  ShoppingCart,
  Sparkles,
  Target,
  Upload,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const selectCls =
  "h-10 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";

const steps = ["Objetivo", "Campanha", "Conjunto", "Anúncio", "Revisão"];

const objectives = [
  { key: "reconhecimento", label: "Reconhecimento", desc: "Alcance e lembrança de marca", icon: Eye },
  { key: "trafego", label: "Tráfego", desc: "Cliques para o site ou app", icon: MousePointerClick },
  { key: "engajamento", label: "Engajamento", desc: "Mensagens, curtidas e interações", icon: Heart },
  { key: "leads", label: "Leads", desc: "Cadastros e formulários", icon: Sparkles },
  { key: "vendas", label: "Vendas", desc: "Conversões e receita", icon: ShoppingCart },
  { key: "mensagens", label: "Mensagens", desc: "Conversas no WhatsApp/Direct", icon: MessageCircle },
];

const formats = [
  { key: "imagem", label: "Imagem única", icon: ImageIcon },
  { key: "carrossel", label: "Carrossel", icon: Images },
  { key: "video", label: "Vídeo", icon: Video },
];

const ctas = ["Saiba mais", "Comprar agora", "Cadastre-se", "Enviar mensagem", "Fale conosco", "Reservar"];

type Form = {
  objective: string;
  campaignName: string;
  category: string;
  cbo: boolean;
  budgetMode: "diario" | "total";
  budget: string;
  bid: string;
  adsetName: string;
  location: string;
  ageMin: string;
  ageMax: string;
  gender: "todos" | "homens" | "mulheres";
  interests: string;
  placement: "auto" | "manual";
  adsetBudget: string;
  page: string;
  format: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  url: string;
};

const initial: Form = {
  objective: "",
  campaignName: "",
  category: "Nenhuma",
  cbo: true,
  budgetMode: "diario",
  budget: "100",
  bid: "Maior volume",
  adsetName: "",
  location: "Brasil",
  ageMin: "18",
  ageMax: "65+",
  gender: "todos",
  interests: "",
  placement: "auto",
  adsetBudget: "50",
  page: "Bella Estética",
  format: "imagem",
  primaryText: "",
  headline: "",
  description: "",
  cta: "Saiba mais",
  url: "",
};

export function CampaignWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(initial);
  const set = (patch: Partial<Form>) => setF((s) => ({ ...s, ...patch }));

  const canContinue =
    (step === 0 && !!f.objective) ||
    (step === 1 && f.campaignName.trim().length > 1) ||
    (step === 2 && f.adsetName.trim().length > 1) ||
    (step === 3 && f.primaryText.trim().length > 1 && f.headline.trim().length > 1) ||
    step === 4;

  function next() {
    if (step < steps.length - 1) setStep((s) => s + 1);
  }
  function publish() {
    toast.success(`Campanha "${f.campaignName}" criada com sucesso.`);
    router.push("/campanhas");
  }

  return (
    <>
      <Link
        href="/campanhas"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Campanhas
      </Link>

      <div className="mb-8">
        <p className="eyebrow">Gerenciador</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Nova campanha
        </h1>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
        {/* Step rail */}
        <ol className="hidden flex-col gap-1 lg:flex">
          {steps.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s}>
                <button
                  onClick={() => i <= step && setStep(i)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
                    active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground",
                    !active && !done && "cursor-default"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      done
                        ? "border-transparent bg-primary text-primary-foreground"
                        : active
                          ? "border-primary text-primary"
                          : "border-border-strong text-soft-foreground"
                    )}
                  >
                    {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  {s}
                </button>
              </li>
            );
          })}
        </ol>

        {/* Conteúdo do passo */}
        <div className="min-w-0">
          {step === 0 && <StepObjective f={f} set={set} />}
          {step === 1 && <StepCampaign f={f} set={set} />}
          {step === 2 && <StepAdset f={f} set={set} />}
          {step === 3 && <StepAd f={f} set={set} />}
          {step === 4 && <StepReview f={f} goto={setStep} />}

          {/* Footer nav */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? router.push("/campanhas") : setStep((s) => s - 1))}
            >
              {step === 0 ? "Cancelar" : "Voltar"}
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={next} disabled={!canContinue}>
                Continuar
              </Button>
            ) : (
              <Button onClick={publish}>
                <Check />
                Publicar campanha
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Passos ── */

function StepObjective({ f, set }: { f: Form; set: (p: Partial<Form>) => void }) {
  return (
    <Section title="Qual o objetivo da campanha?" hint="Escolha o resultado que você quer otimizar.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {objectives.map((o) => {
          const active = f.objective === o.key;
          return (
            <button
              key={o.key}
              onClick={() => set({ objective: o.key })}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                active ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong"
              )}
            >
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-md",
                  active ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                )}
              >
                <o.icon className="size-4.5" />
              </span>
              <span>
                <span className="block text-sm font-medium text-foreground">{o.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{o.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function StepCampaign({ f, set }: { f: Form; set: (p: Partial<Form>) => void }) {
  return (
    <Section title="Configuração da campanha">
      <Field label="Nome da campanha">
        <Input
          value={f.campaignName}
          onChange={(e) => set({ campaignName: e.target.value })}
          placeholder="Ex.: Vendas — Inverno 2026"
        />
      </Field>
      <Field label="Categoria especial de anúncios">
        <select className={selectCls} value={f.category} onChange={(e) => set({ category: e.target.value })}>
          {["Nenhuma", "Crédito", "Emprego", "Habitação", "Política e questões sociais"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Orçamento">
        <div className="flex flex-col gap-2">
          <Toggle
            checked={f.cbo}
            onChange={(v) => set({ cbo: v })}
            label="Otimização do orçamento da campanha (CBO)"
            hint="Distribui o orçamento automaticamente entre os conjuntos."
          />
          {f.cbo && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <select className={selectCls} value={f.budgetMode} onChange={(e) => set({ budgetMode: e.target.value as Form["budgetMode"] })}>
                <option value="diario">Diário</option>
                <option value="total">Vitalício (total)</option>
              </select>
              <PrefixInput prefix="R$" value={f.budget} onChange={(v) => set({ budget: v })} />
            </div>
          )}
        </div>
      </Field>

      <Field label="Estratégia de lance">
        <select className={selectCls} value={f.bid} onChange={(e) => set({ bid: e.target.value })}>
          {["Maior volume", "Custo por resultado meta", "ROAS meta"].map((b) => (
            <option key={b}>{b}</option>
          ))}
        </select>
      </Field>
    </Section>
  );
}

function StepAdset({ f, set }: { f: Form; set: (p: Partial<Form>) => void }) {
  return (
    <Section title="Conjunto de anúncios" hint="Defina público, posicionamentos e orçamento.">
      <Field label="Nome do conjunto">
        <Input value={f.adsetName} onChange={(e) => set({ adsetName: e.target.value })} placeholder="Ex.: Lookalike 1% — 25-45" />
      </Field>

      <p className="eyebrow pt-2">Público</p>
      <Field label="Localização">
        <Input value={f.location} onChange={(e) => set({ location: e.target.value })} placeholder="País, estado ou cidade" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Idade mínima">
          <select className={selectCls} value={f.ageMin} onChange={(e) => set({ ageMin: e.target.value })}>
            {["13", "18", "25", "35", "45", "55"].map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
        <Field label="Idade máxima">
          <select className={selectCls} value={f.ageMax} onChange={(e) => set({ ageMax: e.target.value })}>
            {["24", "34", "44", "54", "65+"].map((a) => <option key={a}>{a}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Gênero">
        <Segmented
          value={f.gender}
          onChange={(v) => set({ gender: v as Form["gender"] })}
          options={[
            { key: "todos", label: "Todos" },
            { key: "homens", label: "Homens" },
            { key: "mulheres", label: "Mulheres" },
          ]}
        />
      </Field>
      <Field label="Interesses / segmentação detalhada">
        <Input value={f.interests} onChange={(e) => set({ interests: e.target.value })} placeholder="Ex.: skincare, estética, autocuidado" />
      </Field>

      <p className="eyebrow pt-2">Posicionamentos</p>
      <Segmented
        value={f.placement}
        onChange={(v) => set({ placement: v as Form["placement"] })}
        options={[
          { key: "auto", label: "Automáticos (Advantage+)" },
          { key: "manual", label: "Manuais" },
        ]}
      />

      {!f.cbo && (
        <Field label="Orçamento diário do conjunto">
          <PrefixInput prefix="R$" value={f.adsetBudget} onChange={(v) => set({ adsetBudget: v })} />
        </Field>
      )}
    </Section>
  );
}

function StepAd({ f, set }: { f: Form; set: (p: Partial<Form>) => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
      <Section title="Anúncio">
        <Field label="Página / Identidade">
          <select className={selectCls} value={f.page} onChange={(e) => set({ page: e.target.value })}>
            {["Bella Estética", "Clínica Vitalis", "Loja Norte Calçados"].map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>

        <Field label="Formato">
          <div className="grid grid-cols-3 gap-2">
            {formats.map((fmt) => {
              const active = f.format === fmt.key;
              return (
                <button
                  key={fmt.key}
                  onClick={() => set({ format: fmt.key })}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-md border p-3 text-xs font-medium transition-colors",
                    active ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-muted-foreground hover:border-border-strong"
                  )}
                >
                  <fmt.icon className="size-5" />
                  {fmt.label}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Criativo">
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong bg-surface-2/40 px-4 py-8 text-center">
            <Upload className="size-5 text-soft-foreground" />
            <p className="text-sm text-muted-foreground">Arraste uma imagem/vídeo ou clique para enviar</p>
            <p className="text-xs text-soft-foreground">JPG, PNG ou MP4 · até 30 MB</p>
          </div>
        </Field>

        <Field label="Texto principal">
          <Textarea value={f.primaryText} onChange={(e) => set({ primaryText: e.target.value })} placeholder="Fale com seu público…" />
        </Field>
        <Field label="Título">
          <Input value={f.headline} onChange={(e) => set({ headline: e.target.value })} placeholder="Chamada curta e direta" />
        </Field>
        <Field label="Descrição">
          <Input value={f.description} onChange={(e) => set({ description: e.target.value })} placeholder="Complemento opcional" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Botão (CTA)">
            <select className={selectCls} value={f.cta} onChange={(e) => set({ cta: e.target.value })}>
              {ctas.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="URL de destino">
            <Input value={f.url} onChange={(e) => set({ url: e.target.value })} placeholder="https://…" />
          </Field>
        </div>
      </Section>

      {/* Preview */}
      <div>
        <p className="eyebrow mb-3">Pré-visualização</p>
        <Card className="overflow-hidden p-0">
          <div className="flex items-center gap-2 p-3">
            <div className="size-8 rounded-full bg-surface-2" />
            <div>
              <p className="text-xs font-medium text-foreground">{f.page}</p>
              <p className="text-[10px] text-soft-foreground">Patrocinado</p>
            </div>
          </div>
          {f.primaryText && (
            <p className="px-3 pb-3 text-xs text-foreground">{f.primaryText}</p>
          )}
          <div className="grid aspect-[4/3] place-items-center bg-surface-2 text-soft-foreground">
            <ImageIcon className="size-8" />
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border p-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">
                {f.headline || "Título do anúncio"}
              </p>
              {f.description && (
                <p className="truncate text-[10px] text-soft-foreground">{f.description}</p>
              )}
            </div>
            <span className="shrink-0 rounded-md bg-surface-2 px-2.5 py-1 text-[10px] font-medium text-foreground">
              {f.cta}
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepReview({ f, goto }: { f: Form; goto: (n: number) => void }) {
  const objLabel = objectives.find((o) => o.key === f.objective)?.label ?? "—";
  return (
    <Section title="Revisão" hint="Confira tudo antes de publicar.">
      <ReviewBlock title="Objetivo" onEdit={() => goto(0)} items={[["Objetivo", objLabel]]} />
      <ReviewBlock
        title="Campanha"
        onEdit={() => goto(1)}
        items={[
          ["Nome", f.campaignName || "—"],
          ["Categoria", f.category],
          ["Orçamento", `${f.cbo ? "CBO" : "Por conjunto"} · R$ ${f.cbo ? f.budget : f.adsetBudget}/${f.budgetMode === "diario" ? "dia" : "total"}`],
          ["Lance", f.bid],
        ]}
      />
      <ReviewBlock
        title="Conjunto"
        onEdit={() => goto(2)}
        items={[
          ["Nome", f.adsetName || "—"],
          ["Público", `${f.location} · ${f.ageMin}–${f.ageMax} · ${f.gender}`],
          ["Posicionamentos", f.placement === "auto" ? "Automáticos" : "Manuais"],
        ]}
      />
      <ReviewBlock
        title="Anúncio"
        onEdit={() => goto(3)}
        items={[
          ["Página", f.page],
          ["Formato", formats.find((x) => x.key === f.format)?.label ?? "—"],
          ["Título", f.headline || "—"],
          ["CTA", f.cta],
        ]}
      />
    </Section>
  );
}

/* ── Auxiliares ── */

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </div>
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

function PrefixInput({ prefix, value, onChange }: { prefix: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex h-10 items-center rounded-md border border-input bg-surface focus-within:border-border-strong focus-within:ring-2 focus-within:ring-ring/40">
      <span className="pl-3 text-sm text-soft-foreground">{prefix}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        className="tnum h-full w-full bg-transparent px-2 text-sm text-foreground focus:outline-none"
      />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-start gap-3 rounded-md border border-border bg-surface p-3 text-left transition-colors hover:border-border-strong"
    >
      <span
        className={cn(
          "mt-0.5 grid size-4 shrink-0 place-items-center rounded border transition-colors",
          checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface"
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-soft-foreground">{hint}</span>}
      </span>
    </button>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-surface p-1">
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

function ReviewBlock({
  title,
  items,
  onEdit,
}: {
  title: string;
  items: [string, string][];
  onEdit: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <button onClick={onEdit} className="text-xs font-medium text-primary hover:underline">
          Editar
        </button>
      </div>
      <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-xs text-soft-foreground">{k}</dt>
            <dd className="text-sm text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
