export type CampaignObjective =
  | 'OUTCOME_SALES'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_ENGAGEMENT';

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type CallToAction =
  | 'LEARN_MORE'
  | 'SHOP_NOW'
  | 'SIGN_UP'
  | 'CONTACT_US'
  | 'DOWNLOAD'
  | 'ORDER_NOW'
  | 'SUBSCRIBE';

export const OBJECTIVE_LABELS: Record<CampaignObjective, { label: string; description: string }> = {
  OUTCOME_SALES: { label: 'Vendas / Conversão', description: 'Otimiza para compras, cadastros ou ações no site' },
  OUTCOME_LEADS: { label: 'Geração de Leads', description: 'Coleta informações de potenciais clientes' },
  OUTCOME_TRAFFIC: { label: 'Tráfego', description: 'Direciona pessoas para seu site ou app' },
  OUTCOME_AWARENESS: { label: 'Reconhecimento', description: 'Alcança o máximo de pessoas possível' },
  OUTCOME_ENGAGEMENT: { label: 'Engajamento', description: 'Gera curtidas, comentários e compartilhamentos' },
};

export const CTA_LABELS: Record<CallToAction, string> = {
  LEARN_MORE: 'Saiba Mais',
  SHOP_NOW: 'Comprar Agora',
  SIGN_UP: 'Cadastre-se',
  CONTACT_US: 'Fale Conosco',
  DOWNLOAD: 'Baixar',
  ORDER_NOW: 'Peça Agora',
  SUBSCRIBE: 'Assinar',
};

export interface Interest {
  id: string;
  name: string;
  audience_size_lower_bound?: number;
  audience_size_upper_bound?: number;
}

export interface FacebookPage {
  id: string;
  name: string;
  picture?: { data?: { url?: string } };
}

export interface CampaignCreateData {
  name: string;
  objective: CampaignObjective;
  daily_budget: number;
  status: CampaignStatus;
  special_ad_categories: string[];
}

export interface AdsetCreateData {
  campaign_id: string;
  name: string;
  optimization_goal: string;
  billing_event: string;
  targeting: {
    age_min: number;
    age_max: number;
    genders: number[];
    geo_locations: { countries: string[] };
    interests?: Interest[];
    publisher_platforms?: string[];
    facebook_positions?: string[];
    instagram_positions?: string[];
  };
  start_time?: string;
  end_time?: string;
  status: CampaignStatus;
}

export interface AdCreateData {
  adset_id: string;
  name: string;
  page_id: string;
  creative: {
    image_url?: string;
    headline: string;
    body: string;
    description?: string;
    call_to_action: CallToAction;
    link_url: string;
  };
  status: CampaignStatus;
}

export interface CampaignActionLog {
  id: string;
  client_id: string;
  manager_id: string;
  action_type: string;
  object_type: string;
  external_object_id: string;
  details: Record<string, any>;
  created_at: string;
}
