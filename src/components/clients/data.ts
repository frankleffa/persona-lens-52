/**
 * Modelo e dados de exemplo da carteira de clientes.
 * Estrutura espelha o domínio real (estratégia, score de saúde, status,
 * plataformas conectadas) para facilitar religar ao backend depois.
 */

export type ClientStatus = "growing" | "stable" | "attention" | "critical";
export type Strategy =
  | "Performance"
  | "Branding"
  | "Full Funnel"
  | "Lead Gen"
  | "E-commerce";
export type Platform = "Meta" | "Google" | "GA4";

export type Client = {
  id: string;
  name: string;
  strategy: Strategy;
  status: ClientStatus;
  score: number; // saúde da conta 0–100
  platforms: Platform[];
  spend: number; // investimento no mês
  roas: number;
  delta: number; // variação % vs mês anterior
  lastSync: string;
};

export const statusMeta: Record<
  ClientStatus,
  { label: string; variant: "success" | "brand" | "warning" | "danger"; bar: string }
> = {
  growing: { label: "Crescendo", variant: "success", bar: "var(--success)" },
  stable: { label: "Estável", variant: "brand", bar: "var(--primary)" },
  attention: { label: "Atenção", variant: "warning", bar: "var(--warning)" },
  critical: { label: "Crítico", variant: "danger", bar: "var(--destructive)" },
};

export const clients: Client[] = [
  { id: "1", name: "Clínica Vitalis", strategy: "Lead Gen", status: "growing", score: 88, platforms: ["Meta", "Google", "GA4"], spend: 24300, roas: 5.4, delta: 18.2, lastSync: "há 6 min" },
  { id: "2", name: "Loja Norte Calçados", strategy: "E-commerce", status: "stable", score: 72, platforms: ["Meta", "Google"], spend: 41800, roas: 3.6, delta: 4.1, lastSync: "há 12 min" },
  { id: "3", name: "EduPro Cursos", strategy: "Full Funnel", status: "attention", score: 54, platforms: ["Meta", "GA4"], spend: 15200, roas: 2.1, delta: -8.7, lastSync: "há 1 h" },
  { id: "4", name: "AutoCenter Premium", strategy: "Lead Gen", status: "critical", score: 33, platforms: ["Google"], spend: 9800, roas: 1.4, delta: -22.5, lastSync: "há 3 h" },
  { id: "5", name: "Bella Estética", strategy: "Performance", status: "growing", score: 91, platforms: ["Meta", "Google", "GA4"], spend: 18750, roas: 6.2, delta: 27.4, lastSync: "há 4 min" },
  { id: "6", name: "TechParts B2B", strategy: "Lead Gen", status: "stable", score: 68, platforms: ["Google", "GA4"], spend: 33100, roas: 3.1, delta: 1.9, lastSync: "há 20 min" },
  { id: "7", name: "Sabor & Cia Delivery", strategy: "Performance", status: "attention", score: 49, platforms: ["Meta"], spend: 12640, roas: 1.9, delta: -5.3, lastSync: "há 2 h" },
  { id: "8", name: "Imobiliária Horizonte", strategy: "Branding", status: "stable", score: 76, platforms: ["Meta", "Google"], spend: 28900, roas: 4.0, delta: 6.8, lastSync: "há 9 min" },
];
