/**
 * Dados estilo Gerenciador da Meta: BMs, contas de anúncio, catálogo de
 * colunas e linhas por nível (campanha / conjunto / anúncio).
 * Dados de exemplo — backend será religado depois.
 */

export type Level = "campaign" | "adset" | "ad";
export type RowStatus = "ativa" | "pausada" | "limitada" | "reprovada";

export type AdAccount = { id: string; name: string };
export type Business = { id: string; name: string; accounts: AdAccount[] };

export const businesses: Business[] = [
  {
    id: "bm_adscape",
    name: "Agência AdScape",
    accounts: [
      { id: "act_1029384", name: "Bella Estética" },
      { id: "act_1058120", name: "Clínica Vitalis" },
      { id: "act_1077220", name: "Loja Norte Calçados" },
    ],
  },
  {
    id: "bm_parceiro",
    name: "Studio Parceiro",
    accounts: [{ id: "act_2011905", name: "Sabor & Cia Delivery" }],
  },
];

export type Row = {
  id: string;
  account: string;
  level: Level;
  name: string;
  status: RowStatus;
  delivery: boolean; // veiculação on/off
  parent?: string; // nome do pai (exibição)
  parentId?: string; // id do pai (drill-down)
  budget: number; // diário
  results: number;
  reach: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  cpa: number; // custo por resultado
  roas: number;
};

export const statusMeta: Record<
  RowStatus,
  { label: string; variant: "success" | "warning" | "neutral" | "danger" }
> = {
  ativa: { label: "Ativa", variant: "success" },
  limitada: { label: "Limitada", variant: "warning" },
  pausada: { label: "Pausada", variant: "neutral" },
  reprovada: { label: "Reprovada", variant: "danger" },
};

/** Subconjunto de métricas — usado por colunas e por linhas de repartição. */
export type Metrics = Pick<
  Row,
  | "budget"
  | "results"
  | "reach"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "spend"
  | "cpa"
  | "roas"
>;

// ── Catálogo de colunas (personalizável) ──
export type ColumnKey =
  | "budget"
  | "results"
  | "reach"
  | "impressions"
  | "clicks"
  | "ctr"
  | "cpc"
  | "spend"
  | "cpa"
  | "roas";

const brl = (v: number, max = 2) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: max });
const num = (v: number) => v.toLocaleString("pt-BR");

export const columns: {
  key: ColumnKey;
  label: string;
  format: (r: Metrics) => string;
  total: "sum" | "avg" | "none";
  formatTotal?: (v: number) => string;
}[] = [
  { key: "budget", label: "Orçamento", format: (r) => `${brl(r.budget, 0)}/dia`, total: "none" },
  { key: "results", label: "Resultados", format: (r) => num(r.results), total: "sum", formatTotal: num },
  { key: "reach", label: "Alcance", format: (r) => num(r.reach), total: "sum", formatTotal: num },
  { key: "impressions", label: "Impressões", format: (r) => num(r.impressions), total: "sum", formatTotal: num },
  { key: "clicks", label: "Cliques", format: (r) => num(r.clicks), total: "sum", formatTotal: num },
  { key: "ctr", label: "CTR", format: (r) => `${r.ctr.toFixed(2)}%`, total: "avg", formatTotal: (v) => `${v.toFixed(2)}%` },
  { key: "cpc", label: "CPC", format: (r) => brl(r.cpc), total: "avg", formatTotal: (v) => brl(v) },
  { key: "spend", label: "Valor gasto", format: (r) => brl(r.spend, 0), total: "sum", formatTotal: (v) => brl(v, 0) },
  { key: "cpa", label: "Custo/result.", format: (r) => brl(r.cpa), total: "avg", formatTotal: (v) => brl(v) },
  { key: "roas", label: "ROAS", format: (r) => `${r.roas.toFixed(2)}x`, total: "avg", formatTotal: (v) => `${v.toFixed(2)}x` },
];

export const defaultColumns: ColumnKey[] = [
  "budget",
  "results",
  "reach",
  "impressions",
  "spend",
  "cpa",
  "roas",
];

export const rows: Row[] = [
  // Bella Estética (act_1029384)
  { id: "c1", account: "act_1029384", level: "campaign", name: "BF24 — Remarketing Conversão", status: "ativa", delivery: true, budget: 600, results: 412, reach: 320140, impressions: 842300, clicks: 24400, ctr: 2.9, cpc: 0.75, spend: 18420, cpa: 44.7, roas: 5.2 },
  { id: "c2", account: "act_1029384", level: "campaign", name: "Retargeting Dinâmico", status: "ativa", delivery: true, budget: 350, results: 173, reach: 180300, impressions: 520400, clicks: 17100, ctr: 3.3, cpc: 0.58, spend: 9870, cpa: 57.1, roas: 4.6 },
  { id: "c3", account: "act_1029384", level: "campaign", name: "Topo — Vídeo Reels", status: "pausada", delivery: false, budget: 250, results: 67, reach: 410200, impressions: 980100, clicks: 8800, ctr: 0.9, cpc: 0.74, spend: 6540, cpa: 97.6, roas: 1.6 },
  { id: "c4", account: "act_1029384", level: "campaign", name: "Aquisição — Públicos Frios", status: "limitada", delivery: true, budget: 500, results: 208, reach: 540800, impressions: 1180500, clicks: 20060, ctr: 1.7, cpc: 0.95, spend: 19120, cpa: 91.9, roas: 2.4 },
  { id: "c5", account: "act_1029384", level: "campaign", name: "Lançamento — Inverno", status: "reprovada", delivery: false, budget: 300, results: 0, reach: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, spend: 0, cpa: 0, roas: 0 },
  // Clínica Vitalis
  { id: "c6", account: "act_1058120", level: "campaign", name: "Leads — Consultas", status: "ativa", delivery: true, budget: 400, results: 286, reach: 96400, impressions: 210400, clicks: 12800, ctr: 6.1, cpc: 0.71, spend: 9120, cpa: 31.9, roas: 6.1 },
  { id: "c7", account: "act_1058120", level: "campaign", name: "Remarketing — Agendamento", status: "ativa", delivery: true, budget: 220, results: 142, reach: 54300, impressions: 138200, clicks: 6600, ctr: 4.8, cpc: 0.62, spend: 4080, cpa: 28.7, roas: 7.0 },

  // Conjuntos (Bella Estética)
  { id: "s1", account: "act_1029384", level: "adset", parentId: "c1", parent: "BF24 — Remarketing Conversão", name: "Lookalike 1% — 25-45", status: "ativa", delivery: true, budget: 300, results: 221, reach: 162000, impressions: 410200, clicks: 12100, ctr: 2.9, cpc: 0.74, spend: 8900, cpa: 40.3, roas: 5.6 },
  { id: "s2", account: "act_1029384", level: "adset", parentId: "c1", parent: "BF24 — Remarketing Conversão", name: "Interesses — Beleza & Skincare", status: "ativa", delivery: true, budget: 200, results: 130, reach: 98300, impressions: 280100, clicks: 7600, ctr: 2.7, cpc: 0.81, spend: 6160, cpa: 47.4, roas: 4.8 },
  { id: "s3", account: "act_1029384", level: "adset", parentId: "c3", parent: "Topo — Vídeo Reels", name: "Amplo — Reels 18-34", status: "pausada", delivery: false, budget: 150, results: 41, reach: 250400, impressions: 560300, clicks: 5200, ctr: 0.9, cpc: 0.66, spend: 3420, cpa: 83.4, roas: 1.9 },

  // Anúncios (Bella Estética)
  { id: "a1", account: "act_1029384", level: "ad", parentId: "s1", parent: "Lookalike 1% — 25-45", name: "Criativo — Antes/Depois (vídeo)", status: "ativa", delivery: true, budget: 0, results: 134, reach: 92100, impressions: 240500, clicks: 7400, ctr: 3.1, cpc: 0.72, spend: 5320, cpa: 39.7, roas: 5.9 },
  { id: "a2", account: "act_1029384", level: "ad", parentId: "s1", parent: "Lookalike 1% — 25-45", name: "Criativo — Carrossel Promo", status: "ativa", delivery: true, budget: 0, results: 87, reach: 70200, impressions: 169700, clicks: 4700, ctr: 2.8, cpc: 0.76, spend: 3580, cpa: 41.1, roas: 5.2 },
  { id: "a3", account: "act_1029384", level: "ad", parentId: "s2", parent: "Interesses — Beleza & Skincare", name: "Criativo — Depoimento", status: "limitada", delivery: true, budget: 0, results: 73, reach: 58400, impressions: 151200, clicks: 4100, ctr: 2.7, cpc: 0.83, spend: 3400, cpa: 46.6, roas: 4.7 },
];

// ── Série temporal (gráfico de desempenho) ──
export type SeriesPoint = { day: string; spend: number; results: number };
export const series: SeriesPoint[] = [
  { day: "01/06", spend: 1820, results: 38 },
  { day: "04/06", spend: 2140, results: 47 },
  { day: "07/06", spend: 2380, results: 52 },
  { day: "10/06", spend: 2210, results: 49 },
  { day: "13/06", spend: 2760, results: 63 },
  { day: "16/06", spend: 2590, results: 58 },
  { day: "19/06", spend: 3120, results: 74 },
  { day: "22/06", spend: 3480, results: 86 },
  { day: "25/06", spend: 3240, results: 79 },
  { day: "28/06", spend: 3820, results: 98 },
];

// ── Repartição (breakdown) ──
export type BreakdownRow = Metrics & { name: string };
export type BreakdownKey = "none" | "placement" | "age" | "device" | "region";

const mk = (
  name: string,
  spend: number,
  results: number,
  impressions: number,
  reach: number,
  clicks: number,
  ctr: number,
  cpc: number,
  cpa: number,
  roas: number
): BreakdownRow => ({ name, budget: 0, spend, results, impressions, reach, clicks, ctr, cpc, cpa, roas });

export const breakdowns: { key: BreakdownKey; label: string; rows: BreakdownRow[] }[] = [
  { key: "none", label: "Nenhuma", rows: [] },
  {
    key: "placement",
    label: "Posicionamento",
    rows: [
      mk("Feed", 8420, 196, 380200, 142000, 11200, 2.9, 0.75, 43.0, 5.4),
      mk("Stories", 5210, 121, 290400, 118000, 6800, 2.3, 0.77, 43.1, 4.8),
      mk("Reels", 6840, 138, 410500, 168000, 7900, 1.9, 0.87, 49.6, 4.1),
      mk("Explore", 1920, 41, 96300, 38000, 2100, 2.2, 0.91, 46.8, 3.6),
    ],
  },
  {
    key: "age",
    label: "Idade",
    rows: [
      mk("18–24", 4120, 88, 240100, 98000, 6400, 2.7, 0.64, 46.8, 3.9),
      mk("25–34", 9180, 224, 402300, 162000, 12600, 3.1, 0.73, 41.0, 5.6),
      mk("35–44", 6240, 142, 280400, 119000, 7800, 2.8, 0.80, 43.9, 4.9),
      mk("45–54", 2870, 58, 142200, 61000, 3400, 2.4, 0.84, 49.5, 3.7),
    ],
  },
  {
    key: "device",
    label: "Dispositivo",
    rows: [
      mk("Mobile", 17840, 392, 880400, 348000, 24800, 2.8, 0.72, 45.5, 5.1),
      mk("Desktop", 3920, 86, 168200, 72000, 4100, 2.4, 0.96, 45.6, 3.8),
      mk("Tablet", 980, 22, 41200, 18000, 980, 2.4, 1.00, 44.5, 3.4),
    ],
  },
  {
    key: "region",
    label: "Região",
    rows: [
      mk("São Paulo", 11240, 268, 520300, 208000, 15200, 2.9, 0.74, 41.9, 5.3),
      mk("Rio de Janeiro", 5120, 112, 248100, 99000, 6600, 2.7, 0.78, 45.7, 4.6),
      mk("Minas Gerais", 3680, 78, 178400, 72000, 4400, 2.5, 0.84, 47.2, 4.1),
      mk("Outros", 2640, 50, 131300, 54000, 2900, 2.2, 0.91, 52.8, 3.5),
    ],
  },
];
