import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link
          to="/landing"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta ou utilizar o <strong>Persona Lens</strong>, você concorda com
              estes Termos de Uso. Se não concordar com algum dos termos, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Descrição do Serviço</h2>
            <p>
              O Persona Lens é uma plataforma SaaS que permite a gestores e agências de marketing
              digital consolidar métricas de Google Ads, Meta Ads e Google Analytics 4 em
              dashboards visuais compartilháveis com seus clientes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Cadastro e Conta</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Você deve fornecer informações verdadeiras e mantê-las atualizadas.
              </li>
              <li>
                Você é responsável por manter a confidencialidade de suas credenciais de acesso.
              </li>
              <li>
                Cada conta é pessoal e intransferível. Não é permitido compartilhar credenciais
                entre diferentes usuários.
              </li>
              <li>
                O uso da plataforma é permitido para fins comerciais legítimos de gestão de
                campanhas de mídia paga.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Planos e Pagamento</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                O <strong>Plano Fundadores</strong> custa R$97/mês e inclui até 3 clientes com
                acesso a Google Ads, Meta Ads e GA4.
              </li>
              <li>
                A cobrança é recorrente e realizada mensalmente no cartão cadastrado.
              </li>
              <li>
                O cancelamento pode ser feito a qualquer momento. O acesso permanece ativo
                até o fim do período pago.
              </li>
              <li>
                Não realizamos reembolsos de períodos parciais, exceto por falha comprovada
                do serviço.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Uso Aceitável</h2>
            <p>É proibido:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Usar a plataforma para fins ilegais ou não autorizados.</li>
              <li>Tentar acessar dados de outros usuários sem autorização.</li>
              <li>Realizar engenharia reversa ou extrair o código-fonte da plataforma.</li>
              <li>Revender ou sublicenciar o acesso à plataforma sem autorização prévia por escrito.</li>
              <li>Usar a plataforma de forma que possa comprometer sua disponibilidade ou segurança.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Integrações com Terceiros</h2>
            <p>
              Ao conectar contas do Google Ads, Meta Ads ou GA4, você declara ter autorização
              para acessar esses dados e concorda com os Termos de Serviço das respectivas
              plataformas. O Persona Lens não é responsável por alterações nas políticas ou
              APIs dessas plataformas que possam afetar o funcionamento das integrações.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Disponibilidade do Serviço</h2>
            <p>
              Nos esforçamos para manter a plataforma disponível 24/7, mas não garantimos
              disponibilidade ininterrupta. Manutenções programadas serão comunicadas com
              antecedência. Não nos responsabilizamos por perdas decorrentes de indisponibilidade
              temporária.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Limitação de Responsabilidade</h2>
            <p>
              O Persona Lens não se responsabiliza por decisões de negócio tomadas com base nas
              métricas exibidas na plataforma. Os dados são obtidos diretamente das APIs do Google
              e Meta; não nos responsabilizamos por imprecisões nas métricas fornecidas por essas
              plataformas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Propriedade Intelectual</h2>
            <p>
              Todo o código, design, marca e conteúdo da plataforma são propriedade do Persona Lens.
              Os dados de campanha pertencem ao usuário que os conectou. Ao usar a plataforma,
              você nos concede licença para processar esses dados exclusivamente para fins de
              prestação do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Rescisão</h2>
            <p>
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos,
              após notificação prévia sempre que possível. Em casos de violação grave, a suspensão
              pode ser imediata.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Alterações nos Termos</h2>
            <p>
              Podemos atualizar estes Termos periodicamente. Alterações relevantes serão
              comunicadas com pelo menos 15 dias de antecedência por e-mail. O uso continuado
              da plataforma após esse prazo implica aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca de
              São Paulo/SP para dirimir quaisquer controvérsias.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Contato</h2>
            <p>
              Dúvidas:{" "}
              <a href="mailto:contato@personalens.com.br" className="underline">
                contato@personalens.com.br
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
