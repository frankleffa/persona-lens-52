/**
 * Dados da Central de Controle da Agência e do Portal do Cliente.
 * Mock — espelha o domínio (acesso ao portal, contas atribuídas, saúde,
 * fila de otimizações) para facilitar religar ao backend (manage-clients,
 * sync-daily-metrics) depois.
 */

export type PortalAccess = "ativo" | "convidado" | "sem-acesso";
export type Health = "growing" | "stable" | "attention" | "critical";
export type Platform = "Meta" | "Google" | "GA4";

export type AgencyClient = {
  id: string;
  name: string;
  segment: string;
  manager: string; // gestor responsável (iniciais)
  health: Health;
  score: number; // 0–100
  platforms: Platform[];
  accounts: number; // contas de anúncio conectadas
  spend: number; // investimento no mês
  roas: number;
  delta: number; // variação % vs mês anterior
  pendingTasks: number; // otimizações na fila
  portal: PortalAccess;
  contactEmail: string;
  lastSync: string;
  portal_token?: string;
  portal_visible?: Record<string, boolean>;
};

export const healthMeta: Record<
  Health,
  { label: string; variant: "success" | "brand" | "warning" | "danger"; bar: string }
> = {
  growing: { label: "Crescendo", variant: "success", bar: "var(--success)" },
  stable: { label: "Estável", variant: "brand", bar: "var(--primary)" },
  attention: { label: "Atenção", variant: "warning", bar: "var(--warning)" },
  critical: { label: "Crítico", variant: "danger", bar: "var(--destructive)" },
};

export const portalMeta: Record<
  PortalAccess,
  { label: string; variant: "success" | "warning" | "neutral" }
> = {
  ativo: { label: "Portal ativo", variant: "success" },
  convidado: { label: "Convite enviado", variant: "warning" },
  "sem-acesso": { label: "Sem acesso", variant: "neutral" },
};

export const agencyClients: AgencyClient[] = [
  { id: "1", name: "Clínica Vitalis", segment: "Saúde", manager: "FL", health: "growing", score: 88, platforms: ["Meta", "Google", "GA4"], accounts: 3, spend: 24300, roas: 5.4, delta: 18.2, pendingTasks: 1, portal: "ativo", contactEmail: "marketing@vitalis.com.br", lastSync: "há 6 min" },
  { id: "5", name: "Bella Estética", segment: "Beleza", manager: "FL", health: "growing", score: 91, platforms: ["Meta", "Google", "GA4"], accounts: 3, spend: 18750, roas: 6.2, delta: 27.4, pendingTasks: 0, portal: "ativo", contactEmail: "contato@bellaestetica.com", lastSync: "há 4 min" },
  { id: "8", name: "Imobiliária Horizonte", segment: "Imóveis", manager: "CA", health: "stable", score: 76, platforms: ["Meta", "Google"], accounts: 2, spend: 28900, roas: 4.0, delta: 6.8, pendingTasks: 2, portal: "ativo", contactEmail: "ads@horizonte.com.br", lastSync: "há 9 min" },
  { id: "2", name: "Loja Norte Calçados", segment: "E-commerce", manager: "CA", health: "stable", score: 72, platforms: ["Meta", "Google"], accounts: 2, spend: 41800, roas: 3.6, delta: 4.1, pendingTasks: 1, portal: "convidado", contactEmail: "diretoria@lojanorte.com", lastSync: "há 12 min" },
  { id: "6", name: "TechParts B2B", segment: "Indústria", manager: "DM", health: "stable", score: 68, platforms: ["Google", "GA4"], accounts: 2, spend: 33100, roas: 3.1, delta: 1.9, pendingTasks: 0, portal: "convidado", contactEmail: "growth@techparts.com.br", lastSync: "há 20 min" },
  { id: "3", name: "EduPro Cursos", segment: "Educação", manager: "DM", health: "attention", score: 54, platforms: ["Meta", "GA4"], accounts: 2, spend: 15200, roas: 2.1, delta: -8.7, pendingTasks: 3, portal: "sem-acesso", contactEmail: "marketing@edupro.com", lastSync: "há 1 h" },
  { id: "7", name: "Sabor & Cia Delivery", segment: "Alimentação", manager: "FL", health: "attention", score: 49, platforms: ["Meta"], accounts: 1, spend: 12640, roas: 1.9, delta: -5.3, pendingTasks: 4, portal: "sem-acesso", contactEmail: "contato@saborecia.com", lastSync: "há 2 h" },
  { id: "4", name: "AutoCenter Premium", segment: "Automotivo", manager: "CA", health: "critical", score: 33, platforms: ["Google"], accounts: 1, spend: 9800, roas: 1.4, delta: -22.5, pendingTasks: 5, portal: "sem-acesso", contactEmail: "gerencia@autocenter.com", lastSync: "há 3 h" },
];

export function getAgencyClient(id: string): AgencyClient | undefined {
  return agencyClients.find((c) => c.id === id);
}

/* ── Dados do Portal do Cliente (visão white-label, somente leitura) ── */

export type PortalKpi = { label: string; value: string; delta: number; invert?: boolean };
export type PortalPoint = { day: string; invest: number; resultado: number };
export type PortalCampaign = { name: string; platform: "Meta" | "Google"; spend: number; results: number; cpa: number; roas: number };

export type PortalData = {
  kpis: PortalKpi[];
  series: PortalPoint[];
  campaigns: PortalCampaign[];
  lastReport: { period: string; sentAt: string };
};

/** Gera um conjunto coerente de dados do portal a partir do cliente. */
export function portalDataFor(c: AgencyClient): PortalData {
  const results = Math.round(c.spend / 90);
  const revenue = Math.round(c.spend * c.roas);
  const cpa = c.spend / Math.max(results, 1);
  const base = c.spend / 10;
  const series: PortalPoint[] = Array.from({ length: 10 }, (_, i) => {
    const wave = 0.7 + 0.5 * Math.sin((i / 9) * Math.PI) + i * 0.03;
    const invest = Math.round((base * wave) / 10) * 10;
    return { day: `${(i * 3 + 1).toString().padStart(2, "0")}/06`, invest, resultado: Math.round(invest * c.roas) };
  });
  return {
    kpis: [
      { label: "Investimento", value: brl(c.spend), delta: c.delta },
      { label: "Receita atribuída", value: brl(revenue), delta: c.delta + 4 },
      { label: "ROAS", value: `${c.roas.toFixed(1)}x`, delta: c.delta - 2 },
      { label: "Resultados", value: results.toLocaleString("pt-BR"), delta: c.delta + 1 },
      { label: "CPA", value: brl(Math.round(cpa)), delta: -c.delta / 2, invert: true },
    ],
    series,
    campaigns: [
      { name: "Conversão — Remarketing", platform: "Meta", spend: Math.round(c.spend * 0.42), results: Math.round(results * 0.45), cpa: cpa * 0.8, roas: c.roas * 1.2 },
      { name: "Search — Marca", platform: "Google", spend: Math.round(c.spend * 0.28), results: Math.round(results * 0.32), cpa: cpa * 0.7, roas: c.roas * 1.4 },
      { name: "Advantage+ Aquisição", platform: "Meta", spend: Math.round(c.spend * 0.3), results: Math.round(results * 0.23), cpa: cpa * 1.3, roas: c.roas * 0.7 },
    ],
    lastReport: { period: "01–25 de junho", sentAt: "há 2 dias" },
  };
}

export function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
