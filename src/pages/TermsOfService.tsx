import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function TermsOfService() {
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

        <h1 className="mb-2 text-3xl font-bold">Termos de Serviço</h1>
        <p className="mb-8 text-sm text-muted-foreground">Última atualização: 15 de fevereiro de 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou utilizar a plataforma <strong className="text-foreground">AdScape</strong>, você concorda
              em cumprir estes Termos de Serviço. Caso não concorde com qualquer parte destes termos, você não deve
              utilizar a plataforma.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">2. Descrição do Serviço</h2>
            <p>
              A AdScape é uma plataforma de dashboard de marketing digital que consolida métricas de diferentes
              plataformas de anúncios, incluindo Google Ads, Meta Ads e Google Analytics 4, permitindo a visualização
              unificada de dados de campanhas publicitárias.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">3. Cadastro e Conta</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso</li>
              <li>As informações fornecidas no cadastro devem ser precisas e atualizadas</li>
              <li>Você é responsável por todas as atividades realizadas em sua conta</li>
              <li>A AdScape se reserva o direito de suspender contas que violem estes termos</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">4. Uso Permitido</h2>
            <p>Ao utilizar a plataforma, você concorda em:</p>
            <ul className="list-disc space-y-1 pl-5 mt-2">
              <li>Utilizar o serviço apenas para fins lícitos e de acordo com estes termos</li>
              <li>Não tentar acessar dados de outros usuários sem autorização</li>
              <li>Não utilizar bots, scrapers ou métodos automatizados não autorizados</li>
              <li>Não interferir no funcionamento ou segurança da plataforma</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">5. Integrações com Terceiros</h2>
            <p>
              A AdScape se integra com plataformas de terceiros (Google Ads, Meta Ads, Google Analytics 4) via OAuth 2.0.
              Ao conectar suas contas, você autoriza a AdScape a acessar dados de leitura dessas plataformas conforme
              descrito em nossa <Link to="/privacy" className="text-primary underline hover:text-primary/80">Política de Privacidade</Link>.
            </p>
            <p className="mt-2">
              A AdScape não se responsabiliza por alterações, indisponibilidades ou mudanças nas APIs de terceiros que
              possam impactar o funcionamento do serviço.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, design, código e funcionalidades da plataforma AdScape são de propriedade exclusiva da
              AdScape. É proibida a reprodução, distribuição ou modificação sem autorização prévia por escrito.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">7. Limitação de Responsabilidade</h2>
            <p>
              A AdScape fornece o serviço "como está" e não garante que será ininterrupto ou livre de erros. Não nos
              responsabilizamos por:
            </p>
            <ul className="list-disc space-y-1 pl-5 mt-2">
              <li>Perdas decorrentes de decisões baseadas nos dados exibidos na plataforma</li>
              <li>Interrupções causadas por falhas em serviços de terceiros</li>
              <li>Danos indiretos, incidentais ou consequenciais</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">8. Cancelamento</h2>
            <p>
              Você pode cancelar sua conta a qualquer momento. Ao cancelar, seus dados serão removidos conforme descrito
              em nossa Política de Privacidade. A AdScape se reserva o direito de encerrar contas que violem estes
              termos, com notificação prévia quando possível.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">9. Alterações nos Termos</h2>
            <p>
              A AdScape pode atualizar estes termos periodicamente. Alterações significativas serão comunicadas por
              e-mail ou notificação na plataforma. O uso continuado após as alterações constitui aceitação dos novos
              termos.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">10. Legislação Aplicável</h2>
            <p>
              Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida
              no foro da comarca da sede da AdScape.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">11. Contato</h2>
            <p>
              Para dúvidas sobre estes termos, entre em contato pelo e-mail disponível em sua conta de gestor ou
              através do suporte da plataforma.
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
