import { FileText } from "lucide-react";
import type { Report } from "./data";

const kpis = [
  { label: "Investido", value: "R$ 18.420" },
  { label: "Leads", value: "412" },
  { label: "CPA", value: "R$ 44,70" },
  { label: "ROAS", value: "5,2x" },
];
const bars = [40, 55, 48, 70, 64, 86, 78];
const top = [
  { name: "BF24 — Remarketing", roas: "5,2x" },
  { name: "Search — Marca", roas: "6,1x" },
  { name: "Retargeting Dinâmico", roas: "4,6x" },
];

/** Pré-visualização de como o relatório chega no WhatsApp do cliente. */
export function ReportPreview({ report }: { report: Report }) {
  const periodo = report.freq === "mensal" ? "junho/2026" : "01–07/jun";
  return (
    <div className="mx-auto max-w-[320px]">
      {/* Janela do WhatsApp */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface-2">
        <div className="flex items-center gap-2.5 bg-[#075E54] px-3 py-2.5 text-white">
          <div className="grid size-8 place-items-center rounded-full bg-white/20 text-xs font-semibold">
            {report.client.slice(0, 2).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">{report.client}</p>
            <p className="text-[10px] text-white/70">online</p>
          </div>
        </div>

        <div className="space-y-2 bg-[#0b141a] p-3">
          {/* Bolha com o relatório */}
          <div className="ml-auto max-w-[88%] rounded-lg rounded-tr-sm bg-[#005c4b] p-1.5 shadow">
            {/* "imagem" do relatório (branded) */}
            <div className="overflow-hidden rounded-md bg-surface">
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="grid size-5 place-items-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
                    {report.whiteLabel ? "B" : "A"}
                  </div>
                  <span className="text-[11px] font-semibold text-foreground">
                    {report.whiteLabel ? report.client : "AdScape"}
                  </span>
                </div>
                <span className="text-[10px] text-soft-foreground">{periodo}</span>
              </div>

              <div className="grid grid-cols-2 gap-px bg-border">
                {kpis.map((k) => (
                  <div key={k.label} className="bg-surface p-2.5">
                    <p className="text-[9px] uppercase tracking-wide text-soft-foreground">{k.label}</p>
                    <p className="tnum mt-0.5 text-sm font-semibold text-foreground">{k.value}</p>
                  </div>
                ))}
              </div>

              {/* mini gráfico */}
              <div className="flex items-end gap-1 px-3 pb-2 pt-3">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-primary" style={{ height: `${h * 0.4}px`, opacity: 0.55 + (h / 200) }} />
                ))}
              </div>

              {/* top campanhas */}
              <div className="border-t border-border px-3 py-2">
                {top.map((t) => (
                  <div key={t.name} className="flex items-center justify-between py-0.5">
                    <span className="truncate text-[10px] text-muted-foreground">{t.name}</span>
                    <span className="tnum text-[10px] font-medium text-foreground">{t.roas}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* anexo PDF */}
            <div className="mt-1.5 flex items-center gap-2 rounded-md bg-black/20 px-2.5 py-2">
              <FileText className="size-4 text-white/90" />
              <span className="truncate text-[11px] text-white/90">
                relatorio-{report.client.toLowerCase().replace(/\s+/g, "-")}.pdf
              </span>
            </div>

            <p className="px-1 pt-1 text-[11px] leading-snug text-white/95">
              Olá! Segue o relatório de {periodo} da {report.client}. ROAS de 5,2x no período 🚀
              Qualquer dúvida, estou à disposição.
            </p>
            <p className="pr-1 text-right text-[9px] text-white/60">{report.time} ✓✓</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-soft-foreground">
        Prévia do envio · {report.whatsapp}
      </p>
    </div>
  );
}
