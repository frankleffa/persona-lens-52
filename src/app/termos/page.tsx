import type { Metadata } from "next";
import { LegalPage } from "@/components/landing/legal-page";

export const metadata: Metadata = {
  title: "Termos de Uso — AdScape",
  description: "Termos e condições de uso da plataforma AdScape.",
};

export default function Termos() {
  return (
    <LegalPage
      title="Termos de Uso"
      updated="25 de junho de 2026"
      sections={[
        { h: "1. Aceitação", p: "Ao criar uma conta e usar o AdScape, você concorda com estes Termos de Uso e com a Política de Privacidade." },
        { h: "2. Conta e equipe", p: "Você é responsável por manter a confidencialidade do acesso e pelas ações realizadas por membros da sua equipe, conforme os papéis atribuídos." },
        { h: "3. Uso aceitável", p: "Você concorda em não usar a plataforma para fins ilegais, para violar políticas das plataformas de anúncios conectadas ou para enviar comunicações não autorizadas." },
        { h: "4. Planos e cobrança", p: "Os planos são cobrados de forma recorrente (mensal ou anual). Você pode cancelar a qualquer momento; o acesso permanece ativo até o fim do período pago." },
        { h: "5. Período de teste", p: "O teste gratuito de 14 dias não exige cartão. Ao final, é necessário assinar um plano para continuar usando os recursos." },
        { h: "6. Limitação de responsabilidade", p: "O AdScape é uma ferramenta de gestão e apresentação de dados. Decisões de mídia e seus resultados são de responsabilidade do usuário." },
        { h: "7. Alterações", p: "Podemos atualizar estes termos periodicamente. Mudanças relevantes serão comunicadas pelos canais oficiais." },
      ]}
    />
  );
}
