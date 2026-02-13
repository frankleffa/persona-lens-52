
-- Landing page editable content (single row, admin-only)
CREATE TABLE public.landing_page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.landing_page_content ENABLE ROW LEVEL SECURITY;

-- Anyone can read (public page)
CREATE POLICY "Anyone can read landing content"
  ON public.landing_page_content
  FOR SELECT
  USING (true);

-- Only admins can update
CREATE POLICY "Admins can update landing content"
  ON public.landing_page_content
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert landing content"
  ON public.landing_page_content
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default content
INSERT INTO public.landing_page_content (content) VALUES ('{
  "hero_title": "Você roda tráfego profissional.\nPor que apresenta como amador?",
  "hero_subtitle": "Pare de mandar PDF, planilha ou print do gerenciador.\nMostre seus resultados em um dashboard visual e organizado, em tempo real.",
  "hero_cta": "Quero mostrar meus resultados direito",
  "pain_title": "Se você ainda faz isso…",
  "pain_items": ["Envia relatório em PDF todo mês", "Tira print do Ads", "Monta planilha manual", "Explica número por número no WhatsApp"],
  "pain_conclusion": "Você está perdendo autoridade.",
  "solution_title": "Resultados bons merecem apresentação boa.",
  "solution_text": "Organize Google Ads, Meta Ads e GA4 em um único painel visual. Seus clientes acessam os resultados em tempo real, sem precisar de PDF, planilha ou print.",
  "benefits": ["Consolidado geral de investimento e resultados", "Separação por plataforma", "Controle do que o cliente pode ver", "Dados atualizados em tempo real", "Visual limpo e profissional"],
  "steps_title": "Como funciona",
  "steps": ["Conecte suas contas", "Selecione quais entram no painel", "Crie o cliente", "Compartilhe o acesso"],
  "plan_title": "Plano Fundadores",
  "plan_price": "R$97/mês",
  "plan_features": ["Até 3 clientes", "Google + Meta + GA4", "Dashboard completo", "Controle por cliente"],
  "plan_cta": "Começar agora",
  "final_cta_title": "Se seus resultados são profissionais,\nsua apresentação também deveria ser.",
  "final_cta_button": "Quero parar de mandar PDF"
}'::jsonb);
