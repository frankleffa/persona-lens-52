/**
 * Dados de exemplo do dashboard piloto.
 * O backend será refeito depois — aqui é só para validar o visual.
 */

export type Kpi = {
  key: string;
  label: string;
  value: string;
  delta: number; // variação % vs período anterior
  invert?: boolean; // métricas onde "menor é melhor" (CPA, CPL)
  source: "Meta" | "Google" | "GA4";
};

export const kpis: Kpi[] = [
  { key: "spend", label: "Investimento", value: "R$ 84.320", delta: 12.4, source: "Meta" },
  { key: "revenue", label: "Receita atribuída", value: "R$ 312.900", delta: 23.1, source: "GA4" },
  { key: "roas", label: "ROAS", value: "3,71x", delta: 9.6, source: "GA4" },
  { key: "conversions", label: "Conversões", value: "1.284", delta: 18.2, source: "Meta" },
  { key: "cpa", label: "CPA", value: "R$ 65,67", delta: -7.3, invert: true, source: "Meta" },
  { key: "ctr", label: "CTR", value: "2,84%", delta: 4.1, source: "Google" },
];

export type SeriesPoint = { day: string; spend: number; revenue: number };

export const series: SeriesPoint[] = [
  { day: "01/06", spend: 2100, revenue: 6800 },
  { day: "04/06", spend: 2450, revenue: 7900 },
  { day: "07/06", spend: 2780, revenue: 9100 },
  { day: "10/06", spend: 2600, revenue: 8700 },
  { day: "13/06", spend: 3100, revenue: 11200 },
  { day: "16/06", spend: 2950, revenue: 10800 },
  { day: "19/06", spend: 3500, revenue: 13900 },
  { day: "22/06", spend: 3850, revenue: 15600 },
  { day: "25/06", spend: 3600, revenue: 14200 },
  { day: "28/06", spend: 4200, revenue: 18100 },
];

export type Campaign = {
  name: string;
  platform: "Meta" | "Google";
  status: "ativa" | "pausada" | "limitada";
  spend: number;
  conversions: number;
  cpa: number;
  roas: number;
  delta: number;
};

export const campaigns: Campaign[] = [
  { name: "BF24 — Remarketing Conversão", platform: "Meta", status: "ativa", spend: 18420, conversions: 412, cpa: 44.7, roas: 5.2, delta: 14.8 },
  { name: "Search — Marca Pura", platform: "Google", status: "ativa", spend: 9120, conversions: 286, cpa: 31.9, roas: 6.1, delta: 8.3 },
  { name: "Advantage+ Aquisição", platform: "Meta", status: "limitada", spend: 22310, conversions: 318, cpa: 70.2, roas: 3.1, delta: -5.1 },
  { name: "PMax — Catálogo Geral", platform: "Google", status: "ativa", spend: 15880, conversions: 201, cpa: 79.0, roas: 2.8, delta: -2.4 },
  { name: "Topo — Vídeo Reels", platform: "Meta", status: "pausada", spend: 6540, conversions: 67, cpa: 97.6, roas: 1.6, delta: -18.9 },
];
