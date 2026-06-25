import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Política de Privacidade — AdScape",
  description: "Como o AdScape coleta, usa e protege seus dados.",
};

export default function Privacidade() {
  return (
    <LegalPage
      title="Política de Privacidade"
      updated="25 de junho de 2026"
      sections={[
        { h: "1. Quais dados coletamos", p: "Coletamos dados de conta (nome, e-mail), dados das contas de anúncio que você conecta (Meta Ads, Google Ads, GA4) e dados de uso da plataforma, com o objetivo de operar o serviço de gestão de tráfego." },
        { h: "2. Como usamos os dados", p: "Usamos os dados para exibir métricas, gerar relatórios, executar automações e enviar comunicações que você configurar (como relatórios no WhatsApp). Não vendemos seus dados a terceiros." },
        { h: "3. Integrações de terceiros", p: "Ao conectar plataformas externas, o acesso é feito via OAuth e limitado aos escopos necessários. Você pode revogar o acesso a qualquer momento na área de Conexões." },
        { h: "4. Armazenamento e segurança", p: "Os dados são armazenados em infraestrutura segura, com controle de acesso por papéis na sua equipe e criptografia em trânsito." },
        { h: "5. Seus direitos (LGPD)", p: "Você pode solicitar acesso, correção ou exclusão dos seus dados pessoais. Para isso, entre em contato pelo e-mail de suporte." },
        { h: "6. Contato", p: "Dúvidas sobre privacidade podem ser enviadas para privacidade@adscape.com." },
      ]}
    />
  );
}
