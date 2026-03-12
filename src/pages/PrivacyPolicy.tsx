import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
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

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Quem somos</h2>
            <p>
              O <strong>Persona Lens</strong> é uma plataforma SaaS que consolida métricas de campanhas
              de Google Ads, Meta Ads e Google Analytics 4 em dashboards visuais para agências de
              marketing digital e seus clientes. Ao utilizar nossa plataforma, você concorda com
              esta Política de Privacidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Dados que coletamos</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Dados de conta:</strong> nome, endereço de e-mail e senha (criptografada)
                fornecidos no cadastro.
              </li>
              <li>
                <strong>Dados de desempenho de anúncios:</strong> métricas de campanhas (impressões,
                cliques, conversões, investimento) obtidas via OAuth das plataformas Google Ads,
                Meta Ads e Google Analytics 4, mediante autorização explícita do usuário.
              </li>
              <li>
                <strong>Dados de uso:</strong> logs de acesso, endereço IP, tipo de dispositivo e
                navegador, para fins de segurança e melhoria do serviço.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. Como usamos seus dados</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Exibir métricas de campanhas nos dashboards.</li>
              <li>Autenticar usuários e controlar permissões de acesso.</li>
              <li>Enviar comunicações transacionais (confirmação de cadastro, recuperação de senha).</li>
              <li>Melhorar a experiência e funcionalidades da plataforma.</li>
              <li>Cumprir obrigações legais.</li>
            </ul>
            <p className="mt-3">
              Não vendemos, alugamos ou compartilhamos seus dados com terceiros para fins
              publicitários.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Integrações com terceiros</h2>
            <p>
              Ao conectar contas do <strong>Google Ads</strong>, <strong>Meta Ads</strong> ou{" "}
              <strong>Google Analytics 4</strong>, você autoriza o Persona Lens a acessar dados
              de desempenho dessas plataformas em seu nome, de acordo com os escopos OAuth
              concedidos. Esses dados são usados exclusivamente para exibição nos dashboards.
              O acesso pode ser revogado a qualquer momento nas configurações da plataforma ou
              diretamente nas páginas de permissões do Google e Meta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Retenção de dados</h2>
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa. Ao solicitar a exclusão
              da conta, todos os dados pessoais e tokens de acesso são removidos de nossos
              servidores em até 30 dias, salvo obrigação legal de retenção.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Segurança</h2>
            <p>
              Utilizamos criptografia em trânsito (TLS) e em repouso. Os tokens de acesso OAuth
              são armazenados de forma segura e nunca expostos ao frontend. O acesso aos dados é
              controlado por políticas de Row-Level Security (RLS) no banco de dados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Seus direitos (LGPD)</h2>
            <p>Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Confirmar a existência de tratamento dos seus dados.</li>
              <li>Acessar seus dados.</li>
              <li>Corrigir dados incompletos ou desatualizados.</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação dos dados.</li>
              <li>Revogar o consentimento a qualquer momento.</li>
            </ul>
            <p className="mt-3">
              Para exercer seus direitos, envie um e-mail para{" "}
              <a href="mailto:privacidade@personalens.com.br" className="underline">
                privacidade@personalens.com.br
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Cookies</h2>
            <p>
              Utilizamos cookies estritamente necessários para manter sua sessão autenticada.
              Não utilizamos cookies de rastreamento ou publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Alterações nesta política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Em caso de alterações relevantes,
              notificaremos via e-mail ou aviso na plataforma com pelo menos 15 dias de
              antecedência.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Contato</h2>
            <p>
              Dúvidas sobre privacidade:{" "}
              <a href="mailto:privacidade@personalens.com.br" className="underline">
                privacidade@personalens.com.br
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
