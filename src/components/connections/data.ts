/** Provedores de integração e contas de exemplo (backend será religado depois). */

export type ProviderId = "google_ads" | "meta_ads" | "ga4" | "whatsapp";

export type Provider = {
  id: ProviderId;
  label: string;
  letter: string;
  tint: string; // cor de marca para o ícone
  desc: string;
  accountNoun: string; // "contas" | "propriedades"
};

export type Account = { id: string; name: string; active: boolean };

export const providers: Provider[] = [
  {
    id: "google_ads",
    label: "Google Ads",
    letter: "G",
    tint: "#4285F4",
    desc: "Campanhas de Search, PMax e Display.",
    accountNoun: "contas",
  },
  {
    id: "meta_ads",
    label: "Meta Ads",
    letter: "M",
    tint: "#0866FF",
    desc: "Facebook e Instagram Ads.",
    accountNoun: "contas",
  },
  {
    id: "ga4",
    label: "Google Analytics 4",
    letter: "A",
    tint: "#E8710A",
    desc: "Sessões, conversões e atribuição.",
    accountNoun: "propriedades",
  },
  {
    id: "whatsapp",
    label: "WhatsApp Business",
    letter: "W",
    tint: "#25D366",
    desc: "Relatórios e alertas automáticos.",
    accountNoun: "instâncias",
  },
];

export const initialAccounts: Record<Exclude<ProviderId, "whatsapp">, Account[]> = {
  google_ads: [
    { id: "843-221-9087", name: "Clínica Vitalis — Search", active: true },
    { id: "771-905-1123", name: "Loja Norte — PMax", active: true },
    { id: "560-118-4420", name: "AutoCenter Premium", active: false },
  ],
  meta_ads: [
    { id: "act_10293847", name: "Bella Estética", active: true },
    { id: "act_55810233", name: "Sabor & Cia Delivery", active: true },
    { id: "act_77120945", name: "EduPro Cursos", active: false },
  ],
  ga4: [
    { id: "properties/318840221", name: "vitalis.com.br", active: true },
    { id: "properties/440918237", name: "lojanorte.com", active: false },
  ],
};
