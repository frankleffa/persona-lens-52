import { Sparkles } from "lucide-react";

const kpis = [
  { label: "Investido", value: "R$ 18.420" },
  { label: "Receita", value: "R$ 95.780" },
  { label: "Leads", value: "412" },
  { label: "CPA", value: "R$ 44,70" },
  { label: "ROAS", value: "5,2x" },
  { label: "CTR", value: "2,9%" },
];
const bars = [40, 55, 48, 70, 64, 86, 78, 92];
const camps = [
  { name: "BF24 — Remarketing", spend: "R$ 8.420", roas: "5,2x" },
  { name: "Search — Marca", spend: "R$ 5.210", roas: "6,1x" },
  { name: "Retargeting Dinâmico", spend: "R$ 4.790", roas: "4,6x" },
];
const funnel = [
  { label: "Impressões", value: 100 },
  { label: "Cliques", value: 64 },
  { label: "Leads", value: 28 },
  { label: "Vendas", value: 11 },
];
const compare = [
  { label: "Investimento", now: "R$ 18.420", prev: "R$ 16.400", delta: "+12,3%" },
  { label: "Leads", now: "412", prev: "349", delta: "+18,1%" },
  { label: "ROAS", now: "5,2x", prev: "4,7x", delta: "+10,6%" },
];
const recs = [
  "Escalar “BF24 — Remarketing”: ROAS 5,2x com espaço de orçamento.",
  "Revisar “Topo — Vídeo Reels”: CPA acima da meta, considerar novo criativo.",
  "Testar público lookalike 2% para ampliar alcance qualificado.",
];

function SectionTitle({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-3.5 w-1 rounded-full" style={{ background: accent }} />
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
    </div>
  );
}

export function ReportDocument({
  sections,
  brandName,
  accent = "var(--primary)",
  period = "01–07 de junho, 2026",
}: {
  sections: string[];
  brandName: string;
  accent?: string;
  period?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-xl border border-border bg-surface p-6 shadow-sm">
      {/* Cabeçalho do documento */}
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-md text-sm font-bold text-white" style={{ background: accent }}>
            {brandName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{brandName}</p>
            <p className="text-xs text-soft-foreground">Relatório de desempenho</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{period}</span>
      </div>

      <div className="flex flex-col gap-7">
        {sections.length === 0 && (
          <p className="py-10 text-center text-sm text-soft-foreground">
            Ative ao menos uma seção para montar o relatório.
          </p>
        )}

        {sections.map((s) => {
          if (s === "Resumo (KPIs)")
            return (
              <section key={s}>
                <SectionTitle accent={accent}>Resumo</SectionTitle>
                <div className="grid grid-cols-3 gap-px overflow-hidden rounded-lg bg-border">
                  {kpis.map((k) => (
                    <div key={k.label} className="bg-surface p-3">
                      <p className="text-[10px] uppercase tracking-wide text-soft-foreground">{k.label}</p>
                      <p className="tnum mt-1 text-lg font-semibold text-foreground">{k.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            );
          if (s === "Gráfico de desempenho")
            return (
              <section key={s}>
                <SectionTitle accent={accent}>Desempenho no período</SectionTitle>
                <div className="flex h-32 items-end gap-2 rounded-lg border border-border p-3">
                  {bars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: accent, opacity: 0.5 + h / 200 }} />
                  ))}
                </div>
              </section>
            );
          if (s === "Campanhas")
            return (
              <section key={s}>
                <SectionTitle accent={accent}>Campanhas</SectionTitle>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="eyebrow py-2 font-medium">Campanha</th>
                      <th className="eyebrow py-2 text-right font-medium">Gasto</th>
                      <th className="eyebrow py-2 text-right font-medium">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {camps.map((c) => (
                      <tr key={c.name} className="border-b border-border/60">
                        <td className="py-2 text-foreground">{c.name}</td>
                        <td className="tnum py-2 text-right text-muted-foreground">{c.spend}</td>
                        <td className="tnum py-2 text-right font-medium text-foreground">{c.roas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          if (s === "Funil de conversão")
            return (
              <section key={s}>
                <SectionTitle accent={accent}>Funil de conversão</SectionTitle>
                <div className="flex flex-col gap-1.5">
                  {funnel.map((f) => (
                    <div key={f.label} className="flex items-center gap-3">
                      <span className="w-24 text-xs text-muted-foreground">{f.label}</span>
                      <div className="h-6 flex-1 overflow-hidden rounded bg-surface-2">
                        <div className="flex h-full items-center justify-end rounded px-2 text-[10px] font-medium text-white" style={{ width: `${f.value}%`, background: accent, opacity: 0.6 + f.value / 250 }}>
                          {f.value}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          if (s === "Comparativo de período")
            return (
              <section key={s}>
                <SectionTitle accent={accent}>Comparativo vs período anterior</SectionTitle>
                <div className="grid grid-cols-1 gap-2">
                  {compare.map((c) => (
                    <div key={c.label} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                      <span className="text-sm text-muted-foreground">{c.label}</span>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="tnum text-soft-foreground line-through">{c.prev}</span>
                        <span className="tnum font-medium text-foreground">{c.now}</span>
                        <span className="tnum font-medium text-success">{c.delta}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          if (s === "Recomendações de IA")
            return (
              <section key={s}>
                <SectionTitle accent={accent}>Recomendações de IA</SectionTitle>
                <ul className="flex flex-col gap-2">
                  {recs.map((r) => (
                    <li key={r} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Sparkles className="mt-0.5 size-4 shrink-0" style={{ color: accent }} />
                      {r}
                    </li>
                  ))}
                </ul>
              </section>
            );
          return null;
        })}
      </div>

      <p className="mt-6 border-t border-border pt-3 text-center text-[10px] text-soft-foreground">
        Gerado por {brandName} · AdScape
      </p>
    </div>
  );
}
