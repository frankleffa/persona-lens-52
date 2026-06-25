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
