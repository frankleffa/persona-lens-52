import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <Link
          to="/landing"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="mb-2 text-3xl font-bold">Política de Privacidade</h1>
        <p className="mb-8 text-sm text-muted-foreground">Última atualização: 15 de fevereiro de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. Introdução</h2>
            <p>
              A <strong className="text-foreground">AdScape</strong> ("nós", "nosso") opera uma plataforma de dashboard de
              marketing digital que consolida métricas de diferentes plataformas de anúncios. Esta política descreve como
              coletamos, usamos e protegemos seus dados.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. Dados Coletados</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Informações de autenticação (e-mail, nome)</li>
              <li>Tokens de acesso OAuth para integração com Google Ads, Meta Ads e Google Analytics 4</li>
              <li>Métricas de campanhas publicitárias (impressões, cliques, conversões, gastos, receita)</li>
              <li>Dados de configuração de contas e preferências do usuário</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. Uso dos Dados</h2>
            <p>Os dados coletados são utilizados exclusivamente para:</p>
            <ul className="list-disc space-y-1 pl-5 mt-2">
              <li>Exibir métricas consolidadas no dashboard do usuário</li>
              <li>Gerar relatórios de desempenho de campanhas</li>
              <li>Manter a conexão autenticada com as plataformas de anúncios</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Compartilhamento de Dados</h2>
            <p>
              <strong className="text-foreground">Não compartilhamos, vendemos ou transferimos</strong> seus dados pessoais
              ou de campanhas a terceiros. Os dados são acessados apenas pelo titular da conta e, quando aplicável, pelo
              gestor vinculado.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. APIs de Terceiros</h2>
            <p>
              A AdScape se integra com as seguintes plataformas via OAuth 2.0:
            </p>
            <ul className="list-disc space-y-1 pl-5 mt-2">
              <li><strong className="text-foreground">Google Ads API</strong> — para leitura de métricas de campanhas</li>
              <li><strong className="text-foreground">Meta Marketing API</strong> — para leitura de métricas de anúncios do Facebook e Instagram</li>
              <li><strong className="text-foreground">Google Analytics 4 Data API</strong> — para leitura de dados analíticos</li>
            </ul>
            <p className="mt-2">
              Os tokens de acesso são armazenados de forma segura e utilizados exclusivamente para obter dados de
              desempenho. Não realizamos nenhuma ação de criação, edição ou exclusão de campanhas nas plataformas conectadas.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Segurança</h2>
            <p>
              Utilizamos criptografia em trânsito (TLS/SSL) e em repouso para proteger seus dados. Os tokens OAuth são
              armazenados com criptografia e nunca expostos ao frontend da aplicação.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Direitos do Usuário</h2>
            <p>Você tem o direito de:</p>
            <ul className="list-disc space-y-1 pl-5 mt-2">
              <li>Acessar todos os dados armazenados sobre sua conta</li>
              <li>Solicitar a exclusão completa de seus dados</li>
              <li>Revogar o acesso às plataformas conectadas a qualquer momento</li>
              <li>Desconectar suas contas de anúncios diretamente pelo painel</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">8. Retenção de Dados</h2>
            <p>
              Os dados de métricas são retidos enquanto sua conta estiver ativa. Ao solicitar a exclusão da conta, todos
              os dados associados serão removidos permanentemente em até 30 dias.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">9. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas por e-mail ou
              notificação no aplicativo.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">10. Contato</h2>
            <p>
              Para dúvidas sobre esta política ou solicitações relacionadas a seus dados, entre em contato pelo e-mail
              disponível em sua conta de gestor ou através do suporte da plataforma.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AdScape. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
}
