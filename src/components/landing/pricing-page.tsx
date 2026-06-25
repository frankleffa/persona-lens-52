"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PublicHeader, PublicFooter } from "./public-chrome";

type Plan = { name: string; monthly: number; desc: string; highlight?: boolean };
const plans: Plan[] = [
  { name: "Starter", monthly: 97, desc: "Para quem está começando." },
  { name: "Pro", monthly: 297, desc: "Para o gestor em crescimento.", highlight: true },
  { name: "Agência", monthly: 697, desc: "Para times e operações grandes." },
];

const matrix: { group: string; rows: { label: string; values: (boolean | string)[] }[] }[] = [
  {
    group: "Operação",
    rows: [
      { label: "Clientes", values: ["3", "15", "Ilimitado"] },
      { label: "Usuários da equipe", values: ["1", "5", "20"] },
      { label: "Contas conectadas (Meta/Google/GA4)", values: ["3", "Ilimitado", "Ilimitado"] },
      { label: "Gerenciador de campanhas", values: [true, true, true] },
      { label: "Regras automáticas", values: [false, true, true] },
    ],
  },
  {
    group: "Relatórios & CRM",
    rows: [
      { label: "Relatórios manuais", values: [true, true, true] },
      { label: "Relatórios automáticos no WhatsApp", values: [false, true, true] },
      { label: "Editor white-label", values: [false, true, true] },
      { label: "CRM de leads", values: [false, true, true] },
    ],
  },
  {
    group: "Suporte",
    rows: [
      { label: "Suporte por e-mail", values: [true, true, true] },
      { label: "Suporte prioritário", values: [false, false, true] },
      { label: "Multi-BM", values: [false, false, true] },
    ],
  },
];

export function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const price = (m: number) => (annual ? Math.round((m * 10) / 12) : m);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 50% at 50% 0%, var(--primary-soft), transparent 70%)" }} />
        <div className="relative mx-auto max-w-6xl px-5 pb-10 pt-20 text-center lg:px-8">
          <p className="eyebrow">Preços</p>
          <h1 className="mx-auto mt-2 max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Escolha o plano ideal pra sua operação
          </h1>
          <p className="mt-4 text-muted-foreground">14 dias grátis em qualquer plano. Sem cartão.</p>

          {/* toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1">
            <button onClick={() => setAnnual(false)} className={cn("rounded-full px-4 py-1.5 text-sm font-medium transition-colors", !annual ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground")}>Mensal</button>
            <button onClick={() => setAnnual(true)} className={cn("flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors", annual ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground")}>
              Anual
              <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success">2 meses grátis</span>
            </button>
          </div>
        </div>
      </section>

      {/* cards */}
      <section className="mx-auto max-w-6xl px-5 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {plans.map((p, i) => (
            <div key={p.name} className={cn("relative flex flex-col rounded-xl border bg-surface p-6", p.highlight ? "border-primary shadow-lg" : "border-border")}>
              {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">Mais popular</span>}
              <h3 className="font-medium text-foreground">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                R$ {price(p.monthly)}<span className="text-sm font-normal text-soft-foreground">/mês</span>
              </p>
              {annual && <p className="mt-1 text-xs text-success">cobrado R$ {price(p.monthly) * 12}/ano</p>}
              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {matrix[0].rows.slice(0, 5).map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    {r.values[i] === false ? <Minus className="size-4 shrink-0 text-soft-foreground" /> : <Check className="size-4 shrink-0 text-success" />}
                    {r.label}{typeof r.values[i] === "string" ? `: ${r.values[i]}` : ""}
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlight ? "primary" : "outline"} className="mt-6 w-full"><Link href="/auth">Começar agora</Link></Button>
            </div>
          ))}
        </div>
      </section>

      {/* comparativo */}
      <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
        <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-foreground">Compare os planos</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface scroll-slim">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left"><span className="eyebrow">Recurso</span></th>
                {plans.map((p) => (
                  <th key={p.name} className="px-4 py-3 text-center text-sm font-medium text-foreground">{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((g) => (
                <Fragment key={g.group}>
                  <tr className="bg-surface-2/40">
                    <td colSpan={4} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-soft-foreground">{g.group}</td>
                  </tr>
                  {g.rows.map((r) => (
                    <tr key={r.label} className="border-b border-border/60">
                      <td className="px-4 py-3 text-muted-foreground">{r.label}</td>
                      {r.values.map((v, i) => (
                        <td key={i} className="px-4 py-3 text-center">
                          {v === true ? <Check className="mx-auto size-4 text-success" /> : v === false ? <Minus className="mx-auto size-4 text-soft-foreground" /> : <span className="tnum font-medium text-foreground">{v}</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Dúvidas? <Link href="/#faq" className="font-medium text-primary hover:underline">Veja o FAQ</Link> ou comece grátis agora.
        </p>
      </section>

      <PublicFooter />
    </div>
  );
}
