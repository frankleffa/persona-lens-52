import type { WhatsAppReportMetrics } from "./whatsappReportTypes";

interface MetricData {
  spend?: number;
  revenue?: number;
  roas?: number;
  cpa?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  conversions?: number;
}

interface ComparisonData {
  spend?: number;
  revenue?: number;
  roas?: number;
  cpa?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  conversions?: number;
}

function formatCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(v: number): string {
  return v.toLocaleString("pt-BR");
}

function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

type MetricEntry = {
  key: keyof WhatsAppReportMetrics;
  dataKey: keyof MetricData;
  emoji: string;
  label: string;
  format: (v: number) => string;
};

const METRIC_DEFS: MetricEntry[] = [
  { key: "investment", dataKey: "spend", emoji: "💰", label: "Investimento", format: formatCurrency },
  { key: "revenue", dataKey: "revenue", emoji: "📈", label: "Receita", format: formatCurrency },
  { key: "roas", dataKey: "roas", emoji: "📊", label: "ROAS", format: (v) => `${v.toFixed(2)}x` },
  { key: "cpa", dataKey: "cpa", emoji: "🏷️", label: "CPA", format: formatCurrency },
  { key: "clicks", dataKey: "clicks", emoji: "🖱️", label: "Cliques", format: formatNumber },
  { key: "impressions", dataKey: "impressions", emoji: "👁️", label: "Impressões", format: formatNumber },
  { key: "ctr", dataKey: "ctr", emoji: "📐", label: "CTR", format: (v) => `${v.toFixed(2)}%` },
  { key: "conversions", dataKey: "conversions", emoji: "🎯", label: "Conversões", format: formatNumber },
];

export function buildWhatsAppReport(
  data: MetricData,
  selectedMetrics: WhatsAppReportMetrics,
  includeComparison: boolean,
  previousData?: MetricData
): string {
  const lines: string[] = ["📊 *Adscape • Resumo de Performance*", ""];

  for (const def of METRIC_DEFS) {
    if (!selectedMetrics[def.key]) continue;
    const value = data[def.dataKey] ?? 0;
    lines.push(`${def.emoji} ${def.label}: *${def.format(value)}*`);

    if (includeComparison && previousData) {
      const prev = previousData[def.dataKey] ?? 0;
      const change = pctChange(value, prev);
      const arrow = change > 0 ? "↑" : change < 0 ? "↓" : "→";
      lines.push(`   ${arrow} ${formatPct(change)} vs período anterior`);
    }
  }

  lines.push("");
  lines.push("_Relatório gerado automaticamente pelo Adscape_");

  return lines.join("\n");
}
