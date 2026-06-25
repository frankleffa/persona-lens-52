/** Relatórios automáticos (referência: Metrifiquei). Enviados via WhatsApp. */

export type Freq = "diario" | "semanal" | "mensal";

export type Report = {
  id: string;
  client: string;
  freq: Freq;
  day: string; // "Toda segunda", "Dia 1", "Todo dia"
  time: string; // "08:00"
  whatsapp: string; // número ou grupo
  status: "ativo" | "pausado";
  sections: string[];
  lastSent: string;
  nextSend: string;
  whiteLabel: boolean;
};

export const freqMeta: Record<Freq, string> = {
  diario: "Diário",
  semanal: "Semanal",
  mensal: "Mensal",
};

export const allSections = [
  "Resumo (KPIs)",
  "Gráfico de desempenho",
  "Campanhas",
  "Funil de conversão",
  "Comparativo de período",
  "Recomendações de IA",
];

export const reports: Report[] = [
  {
    id: "1",
    client: "Bella Estética",
    freq: "semanal",
    day: "Toda segunda",
    time: "08:00",
    whatsapp: "+55 11 99812-3344",
    status: "ativo",
    sections: ["Resumo (KPIs)", "Gráfico de desempenho", "Campanhas", "Recomendações de IA"],
    lastSent: "há 3 dias",
    nextSend: "Seg, 08:00",
    whiteLabel: true,
  },
  {
    id: "2",
    client: "Clínica Vitalis",
    freq: "mensal",
    day: "Dia 1",
    time: "09:00",
    whatsapp: "Grupo — Diretoria Vitalis",
    status: "ativo",
    sections: ["Resumo (KPIs)", "Gráfico de desempenho", "Funil de conversão", "Comparativo de período"],
    lastSent: "há 12 dias",
    nextSend: "01/07, 09:00",
    whiteLabel: true,
  },
  {
    id: "3",
    client: "Loja Norte Calçados",
    freq: "semanal",
    day: "Toda sexta",
    time: "18:00",
    whatsapp: "+55 21 98777-1020",
    status: "pausado",
    sections: ["Resumo (KPIs)", "Campanhas"],
    lastSent: "há 10 dias",
    nextSend: "—",
    whiteLabel: false,
  },
  {
    id: "4",
    client: "TechParts B2B",
    freq: "diario",
    day: "Todo dia",
    time: "07:30",
    whatsapp: "+55 11 96555-7788",
    status: "ativo",
    sections: ["Resumo (KPIs)", "Gráfico de desempenho"],
    lastSent: "ontem",
    nextSend: "Amanhã, 07:30",
    whiteLabel: true,
  },
];

// ── Modelos de relatório ──
export type Template = { id: string; name: string; desc: string; sections: string[] };
export const templates: Template[] = [
  { id: "t1", name: "Resumo Semanal", desc: "Visão rápida para enviar toda semana.", sections: ["Resumo (KPIs)", "Gráfico de desempenho", "Campanhas"] },
  { id: "t2", name: "Performance Completo", desc: "Tudo: métricas, funil, campanhas e IA.", sections: allSections },
  { id: "t3", name: "E-commerce / ROAS", desc: "Foco em receita e retorno.", sections: ["Resumo (KPIs)", "Gráfico de desempenho", "Campanhas", "Comparativo de período"] },
  { id: "t4", name: "Leads / CPL", desc: "Geração de leads e custo por lead.", sections: ["Resumo (KPIs)", "Funil de conversão", "Campanhas", "Recomendações de IA"] },
  { id: "t5", name: "Executivo (1 página)", desc: "Direto ao ponto para diretoria.", sections: ["Resumo (KPIs)", "Comparativo de período", "Recomendações de IA"] },
  { id: "t6", name: "Branding / Alcance", desc: "Topo de funil e reconhecimento.", sections: ["Resumo (KPIs)", "Gráfico de desempenho"] },
];

// ── Histórico de envios ──
export type SendStatus = "lido" | "entregue" | "enviado" | "falhou" | "agendado";
export type Send = {
  id: string;
  client: string;
  channel: string;
  at: string;
  status: SendStatus;
};
export const sendStatusMeta: Record<SendStatus, { label: string; variant: "success" | "brand" | "neutral" | "danger" | "warning" }> = {
  lido: { label: "Lido", variant: "success" },
  entregue: { label: "Entregue", variant: "brand" },
  enviado: { label: "Enviado", variant: "neutral" },
  falhou: { label: "Falhou", variant: "danger" },
  agendado: { label: "Agendado", variant: "warning" },
};
export const sends: Send[] = [
  { id: "s1", client: "Bella Estética", channel: "+55 11 99812-3344", at: "Hoje, 08:00", status: "lido" },
  { id: "s2", client: "TechParts B2B", channel: "+55 11 96555-7788", at: "Hoje, 07:30", status: "entregue" },
  { id: "s3", client: "Clínica Vitalis", channel: "Grupo — Diretoria Vitalis", at: "Ontem, 09:00", status: "lido" },
  { id: "s4", client: "Loja Norte Calçados", channel: "+55 21 98777-1020", at: "Ontem, 18:00", status: "falhou" },
  { id: "s5", client: "Bella Estética", channel: "+55 11 99812-3344", at: "Seg, 08:00", status: "lido" },
  { id: "s6", client: "EduPro Cursos", channel: "+55 11 98123-4567", at: "Seg, 10:00", status: "entregue" },
  { id: "s7", client: "TechParts B2B", channel: "+55 11 96555-7788", at: "Dom, 07:30", status: "enviado" },
  { id: "s8", client: "Sabor & Cia Delivery", channel: "+55 31 99000-1122", at: "Amanhã, 09:00", status: "agendado" },
];
