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

function formatCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatNumber(v: number): string {
  return v.toLocaleString("pt-BR");
}

function formatPct(v: number): string {
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(0)}%`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0;
  return ((current - previous) / previous) * 100;
}

function formatPeriodLabel(startDate?: string, endDate?: string): string {
  if (!startDate) return "";
  const fmt = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };
  if (!endDate || startDate === endDate) return fmt(startDate);
  return `${fmt(startDate)} — ${fmt(endDate)}`;
}

type PrimaryKey = "investment" | "revenue" | "roas" | "conversions";
type SecondaryKey = "clicks" | "impressions" | "ctr" | "cpa";

const PRIMARY_METRICS: { key: PrimaryKey; dataKey: keyof MetricData; emoji: string; label: string; format: (v: number) => string }[] = [
  { key: "investment", dataKey: "spend", emoji: "💰", label: "Investimento", format: formatCurrency },
  { key: "revenue", dataKey: "revenue", emoji: "💵", label: "Receita", format: formatCurrency },
  { key: "roas", dataKey: "roas", emoji: "📈", label: "ROAS", format: (v) => `${v.toFixed(2)}x` },
  { key: "conversions", dataKey: "conversions", emoji: "🎯", label: "Conversões", format: formatNumber },
];

const SECONDARY_METRICS: { key: SecondaryKey; dataKey: keyof MetricData; emoji: string; label: string; format: (v: number) => string }[] = [
  { key: "clicks", dataKey: "clicks", emoji: "🖱", label: "Cliques", format: formatNumber },
  { key: "impressions", dataKey: "impressions", emoji: "👁", label: "Impressões", format: formatNumber },
  { key: "ctr", dataKey: "ctr", emoji: "📊", label: "CTR", format: (v) => `${v.toFixed(2)}%` },
  { key: "cpa", dataKey: "cpa", emoji: "💸", label: "CPA", format: formatCurrency },
];

const ALL_METRICS = [...PRIMARY_METRICS, ...SECONDARY_METRICS];

const SEPARATOR = "━━━━━━━━━━━━━━━━━━";

export function buildWhatsAppReport(
  data: MetricData,
  selectedMetrics: WhatsAppReportMetrics,
  includeComparison: boolean,
  previousData?: MetricData,
  clientName?: string,
  startDate?: string,
  endDate?: string
): string {
  const lines: string[] = [];

  // Header
  lines.push("📊 *Adscape • Resumo de Performance*");
  lines.push("");
  if (clientName) lines.push(`Conta: *${clientName}*`);
  const periodLabel = formatPeriodLabel(startDate, endDate);
  if (periodLabel) lines.push(`Período: ${periodLabel}`);

  // Status block
  if (selectedMetrics.roas && data.roas != null) {
    lines.push("");
    if (data.roas >= 2) {
      lines.push("🟢 Resultado positivo no período");
    } else if (data.roas < 1) {
      lines.push("🔴 Retorno abaixo do investimento");
    }
  }

  // Primary metrics
  const primaryLines: string[] = [];
  for (const def of PRIMARY_METRICS) {
    if (!selectedMetrics[def.key]) continue;
    const value = data[def.dataKey] ?? 0;
    primaryLines.push(`${def.emoji} ${def.label}: *${def.format(value)}*`);
  }
  if (primaryLines.length) {
    lines.push("");
    lines.push(SEPARATOR);
    lines.push("");
    lines.push(...primaryLines);
  }

  // Secondary metrics
  const secondaryLines: string[] = [];
  for (const def of SECONDARY_METRICS) {
    if (!selectedMetrics[def.key]) continue;
    const value = data[def.dataKey] ?? 0;
    secondaryLines.push(`${def.emoji} ${def.label}: *${def.format(value)}*`);
  }
  if (secondaryLines.length) {
    lines.push("");
    lines.push(SEPARATOR);
    lines.push("");
    lines.push("_Outros indicadores:_");
    lines.push(...secondaryLines);
  }

  // Comparison block
  if (includeComparison && previousData) {
    const hasPreviousBase = ALL_METRICS.some(
      (def) => selectedMetrics[def.key] && (previousData[def.dataKey] ?? 0) > 0
    );

    lines.push("");
    if (!hasPreviousBase) {
      lines.push("_Comparativo indisponível (sem base anterior)_");
    } else {
      lines.push("_Comparado ao período anterior:_");
      for (const def of ALL_METRICS) {
        if (!selectedMetrics[def.key]) continue;
        const current = data[def.dataKey] ?? 0;
        const prev = previousData[def.dataKey] ?? 0;
        const change = pctChange(current, prev);
        if (change === null) continue; // no base
        lines.push(`• ${def.label}: ${formatPct(change)}`);
      }
    }
  }

  // Footer
  lines.push("");
  lines.push("_Relatório automático • Adscape_");

  return lines.join("\n");
}
