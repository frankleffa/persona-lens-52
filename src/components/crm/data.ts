/** Pipeline de leads do CRM (dados de exemplo; backend será religado depois). */

export type Stage = "novo" | "contato" | "qualificado" | "proposta" | "ganho";

export type Lead = {
  id: string;
  company: string;
  contact: string;
  value: number; // potencial mensal (R$)
  source: "Indicação" | "Meta" | "Google" | "Site" | "Outbound";
  owner: string; // iniciais
  stage: Stage;
};

export const stages: { key: Stage; label: string; color: string }[] = [
  { key: "novo", label: "Novos", color: "var(--muted-foreground)" },
  { key: "contato", label: "Em contato", color: "var(--chart-5)" },
  { key: "qualificado", label: "Qualificados", color: "var(--primary)" },
  { key: "proposta", label: "Proposta", color: "var(--warning)" },
  { key: "ganho", label: "Ganhos", color: "var(--success)" },
];

export const sourceVariant: Record<Lead["source"], "brand" | "neutral" | "success"> = {
  Meta: "brand",
  Google: "neutral",
  Site: "neutral",
  Indicação: "success",
  Outbound: "neutral",
};

export const leads: Lead[] = [
  { id: "1", company: "Studio Pilates Move", contact: "Marina Alves", value: 3500, source: "Indicação", owner: "FL", stage: "novo" },
  { id: "2", company: "Petshop Amigo Fiel", contact: "Rafael Souza", value: 2200, source: "Meta", owner: "FL", stage: "novo" },
  { id: "3", company: "Construtora Âncora", contact: "Juliana Reis", value: 8000, source: "Outbound", owner: "CA", stage: "contato" },
  { id: "4", company: "Restaurante Tropeiro", contact: "Diego Lima", value: 1800, source: "Site", owner: "FL", stage: "contato" },
  { id: "5", company: "Odonto Sorria+", contact: "Beatriz Nunes", value: 4500, source: "Google", owner: "CA", stage: "qualificado" },
  { id: "6", company: "Academia Forma", contact: "Paulo Mendes", value: 3200, source: "Indicação", owner: "FL", stage: "qualificado" },
  { id: "7", company: "Moda Bella Boutique", contact: "Carla Dias", value: 5200, source: "Meta", owner: "CA", stage: "proposta" },
  { id: "8", company: "AutoEscola Direção", contact: "Sérgio Rocha", value: 2800, source: "Site", owner: "FL", stage: "proposta" },
  { id: "9", company: "Imobiliária Cedro", contact: "Lucas Pinto", value: 6400, source: "Indicação", owner: "CA", stage: "ganho" },
  { id: "10", company: "Café Aurora", contact: "Renata Castro", value: 1500, source: "Site", owner: "FL", stage: "ganho" },
];
