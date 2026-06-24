/** Campanhas de exemplo (backend será religado depois). */

export type Platform = "Meta" | "Google";
export type CampaignStatus = "ativa" | "pausada" | "limitada";

export type Campaign = {
  id: string;
  name: string;
  client: string;
  platform: Platform;
  status: CampaignStatus;
  objective: string;
  budget: number; // diário
  spend: number;
  impressions: number;
  ctr: number;
  conversions: number;
  cpa: number;
  roas: number;
  delta: number;
};

export const statusMeta: Record<
  CampaignStatus,
  { label: string; variant: "success" | "warning" | "neutral" }
> = {
  ativa: { label: "Ativa", variant: "success" },
  limitada: { label: "Limitada", variant: "warning" },
  pausada: { label: "Pausada", variant: "neutral" },
};

export const campaigns: Campaign[] = [
  { id: "1", name: "BF24 — Remarketing Conversão", client: "Bella Estética", platform: "Meta", status: "ativa", objective: "Conversões", budget: 600, spend: 18420, impressions: 842300, ctr: 2.9, conversions: 412, cpa: 44.7, roas: 5.2, delta: 14.8 },
  { id: "2", name: "Search — Marca Pura", client: "Clínica Vitalis", platform: "Google", status: "ativa", objective: "Pesquisa", budget: 300, spend: 9120, impressions: 210400, ctr: 6.1, conversions: 286, cpa: 31.9, roas: 6.1, delta: 8.3 },
  { id: "3", name: "Advantage+ Aquisição", client: "Loja Norte Calçados", platform: "Meta", status: "limitada", objective: "Vendas", budget: 800, spend: 22310, impressions: 1180500, ctr: 1.7, conversions: 318, cpa: 70.2, roas: 3.1, delta: -5.1 },
  { id: "4", name: "PMax — Catálogo Geral", client: "Loja Norte Calçados", platform: "Google", status: "ativa", objective: "Performance Max", budget: 500, spend: 15880, impressions: 690200, ctr: 2.2, conversions: 201, cpa: 79.0, roas: 2.8, delta: -2.4 },
  { id: "5", name: "Topo — Vídeo Reels", client: "Sabor & Cia Delivery", platform: "Meta", status: "pausada", objective: "Reconhecimento", budget: 250, spend: 6540, impressions: 980100, ctr: 0.9, conversions: 67, cpa: 97.6, roas: 1.6, delta: -18.9 },
  { id: "6", name: "Lead Gen — Formulário", client: "TechParts B2B", platform: "Meta", status: "ativa", objective: "Cadastros", budget: 400, spend: 11240, impressions: 410800, ctr: 2.4, conversions: 154, cpa: 73.0, roas: 3.4, delta: 6.2 },
  { id: "7", name: "Search — Concorrência", client: "EduPro Cursos", platform: "Google", status: "limitada", objective: "Pesquisa", budget: 220, spend: 7610, impressions: 142300, ctr: 4.8, conversions: 88, cpa: 86.5, roas: 2.1, delta: -7.7 },
  { id: "8", name: "Retargeting Dinâmico", client: "Bella Estética", platform: "Meta", status: "ativa", objective: "Vendas", budget: 350, spend: 9870, impressions: 520400, ctr: 3.3, conversions: 173, cpa: 57.1, roas: 4.6, delta: 11.5 },
];
