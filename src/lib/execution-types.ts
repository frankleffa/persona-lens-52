export type CampaignStatus = "PLANEJAMENTO" | "PRONTO" | "VEICULACAO" | "TESTE" | "FINALIZADO";

export type Platform = "Meta Ads" | "Google Ads" | "TikTok Ads" | "LinkedIn Ads";

export type Objective = "Conversão" | "Geração de Leads" | "Branding" | "Tráfego";

export type CTA = "Comprar Agora" | "Saiba Mais" | "Cadastre-se" | "Baixar" | "Entrar em Contato" | "Inscrever-se";

export interface Creative {
    id: string;
    name: string;
    type: "upload" | "link";
    url: string;
    notes?: string;
}

export interface CampaignCopy {
    headline: string;
    primary_text: string;
    description: string;
    cta: CTA;
}

export interface ChecklistItem {
    id: string;
    text: string;
    checked: boolean;
}

export interface Campaign {
    id: string;
    client_id: string;
    client_name: string;
    campaign_name: string;
    platform: Platform;
    objective: Objective;
    budget: number;
    start_date: string;
    status: CampaignStatus;
    creatives: Creative[];
    copy: CampaignCopy;
    checklist: ChecklistItem[];
    notes: string;
    created_at: string;
}

export const DEFAULT_CHECKLIST: Omit<ChecklistItem, "id">[] = [
    { text: "Pixel validado", checked: false },
    { text: "Evento configurado", checked: false },
    { text: "UTM aplicada", checked: false },
    { text: "Público criado", checked: false },
    { text: "Criativo aprovado", checked: false },
];

export const COLUMN_CONFIG: Record<CampaignStatus, { label: string; icon: string; color: string }> = {
    PLANEJAMENTO: { label: "Planejamento", icon: "📝", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
    PRONTO: { label: "Pronto para Subir", icon: "🎯", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
    VEICULACAO: { label: "Em Veiculação", icon: "🚀", color: "bg-purple-500/15 text-purple-600 border-purple-500/30" },
    TESTE: { label: "Em Teste", icon: "📊", color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
    FINALIZADO: { label: "Finalizado", icon: "✅", color: "bg-green-500/15 text-green-600 border-green-500/30" },
};

export const PLATFORM_COLORS: Record<Platform, string> = {
    "Meta Ads": "bg-blue-600/15 text-blue-600 border-blue-600/30",
    "Google Ads": "bg-red-600/15 text-red-600 border-red-600/30",
    "TikTok Ads": "bg-pink-600/15 text-pink-600 border-pink-600/30",
    "LinkedIn Ads": "bg-indigo-600/15 text-indigo-600 border-indigo-600/30",
};
