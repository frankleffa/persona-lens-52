import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Contact,
  FileText,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <TrustBar />
      <Features />
      <WhatsAppHighlight />
      <ManagerHighlight />
      <Pricing />
      <Testimonials />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <span className="text-sm font-bold">A</span>
      </div>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">AdScape</span>
    </Link>
  );
}

function Header() {
  const nav = [
    { label: "Recursos", href: "#recursos" },
    { label: "Preços", href: "#precos" },
    { label: "Depoimentos", href: "#depoimentos" },
    { label: "FAQ", href: "#faq" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/auth">Entrar</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/auth">Começar grátis</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 50% at 50% 0%, var(--primary-soft), transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-20 text-center lg:px-8 lg:pt-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          O superapp do gestor de tráfego
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Gerencie campanhas, clientes e relatórios em um só lugar
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
          Google Ads, Meta Ads e GA4 unificados. Crie campanhas como no Meta, gerencie sua carteira,
          e envie relatórios automáticos no WhatsApp dos clientes.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/auth">
              Começar grátis
              <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="#recursos">Ver recursos</a>
          </Button>
        </div>
        <p className="mt-4 text-xs text-soft-foreground">14 dias grátis · sem cartão de crédito</p>

        <HeroMock />
      </div>
    </section>
  );
}

function HeroMock() {
  const kpis = [
    { l: "Investido", v: "R$ 84.320" },
    { l: "Receita", v: "R$ 312.900" },
    { l: "ROAS", v: "3,71x" },
    { l: "Conversões", v: "1.284" },
  ];
  const bars = [42, 58, 50, 72, 66, 88, 80, 95];
  return (
    <div className="relative mx-auto mt-14 max-w-4xl">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        {/* barra do navegador */}
        <div className="flex items-center gap-1.5 border-b border-border bg-surface-2/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="size-2.5 rounded-full bg-border-strong" />
          <span className="ml-3 rounded bg-surface px-2 py-0.5 text-[10px] text-soft-foreground">app.adscape.com/dashboard</span>
        </div>
        <div className="p-5 text-left">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.l} className="rounded-lg border border-border bg-surface p-3">
                <p className="text-[10px] uppercase tracking-wide text-soft-foreground">{k.l}</p>
                <p className="tnum mt-1 text-lg font-semibold text-foreground">{k.v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-surface p-4 lg:col-span-2">
              <div className="mb-3 flex h-32 items-end gap-1.5">
                {bars.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm bg-primary" style={{ height: `${h}%`, opacity: 0.45 + h / 200 }} />
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-surface p-4">
              {["Meta Ads", "Google Ads", "GA4"].map((p, i) => (
                <div key={p} className="mb-3 last:mb-0">
                  <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                    <span>{p}</span><span className="tnum text-foreground">{[54, 33, 13][i]}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${[54, 33, 13][i]}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustBar() {
  const stats = [
    { v: "R$ 50M+", l: "em mídia gerenciada" },
    { v: "1.200+", l: "gestores de tráfego" },
    { v: "8.000+", l: "contas conectadas" },
    { v: "99,9%", l: "uptime" },
  ];
  return (
    <section className="border-y border-border bg-surface/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <p className="metric text-2xl font-semibold text-foreground sm:text-3xl">{s.v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const features = [
  { icon: LayoutDashboard, title: "Painel unificado", desc: "Google Ads, Meta Ads e GA4 num só dashboard, com KPIs e atribuição." },
  { icon: Megaphone, title: "Gerenciador estilo Meta", desc: "Crie e edite campanhas, conjuntos e anúncios — com colunas e regras." },
  { icon: Contact, title: "CRM de leads", desc: "Funil de novos clientes em kanban, do primeiro contato ao fechamento." },
  { icon: MessageCircle, title: "Relatórios no WhatsApp", desc: "Relatórios automáticos, agendados e entregues direto no WhatsApp." },
  { icon: Zap, title: "Automação por regras", desc: "Pause campanhas, ajuste orçamento e seja alertado automaticamente." },
  { icon: Users, title: "Equipe & white-label", desc: "Convide a equipe com papéis e entregue tudo com a marca da agência." },
];

function Features() {
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Recursos</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Tudo que sua operação de tráfego precisa
        </h2>
        <p className="mt-3 text-muted-foreground">
          Pare de pular entre plataformas e planilhas. O AdScape centraliza o seu dia a dia.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong">
            <div className="grid size-10 place-items-center rounded-lg bg-primary-soft text-primary">
              <f.icon className="size-5" />
            </div>
            <h3 className="mt-4 font-medium text-foreground">{f.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhatsAppHighlight() {
  return (
    <section className="border-y border-border bg-surface/50">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="eyebrow">Relatórios automáticos</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Seu cliente recebe o resultado no WhatsApp
          </h2>
          <p className="mt-4 text-muted-foreground">
            Monte o relatório uma vez, escolha as seções e a frequência. O AdScape gera e envia
            sozinho — com a marca da sua agência. Você acompanha quem leu, entregou ou falhou.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {["Agendamento diário, semanal ou mensal", "Modelos prontos e editor white-label", "Status de entrega e leitura"].map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm text-foreground">
                <Check className="size-4 text-success" /> {b}
              </li>
            ))}
          </ul>
        </div>
        {/* mock WhatsApp */}
        <div className="mx-auto w-full max-w-sm">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
            <div className="flex items-center gap-2.5 bg-[#075E54] px-4 py-3 text-white">
              <div className="grid size-8 place-items-center rounded-full bg-white/20 text-xs font-semibold">BE</div>
              <div className="leading-tight"><p className="text-sm font-medium">Bella Estética</p><p className="text-[10px] text-white/70">online</p></div>
            </div>
            <div className="space-y-2 bg-[#0b141a] p-4">
              <div className="ml-auto max-w-[90%] rounded-lg rounded-tr-sm bg-[#005c4b] p-2">
                <div className="rounded-md bg-surface p-3">
                  <p className="text-[11px] font-semibold text-foreground">Relatório semanal · 01–07 jun</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {[["ROAS", "5,2x"], ["Leads", "412"], ["CPA", "R$ 44"], ["Gasto", "R$ 18k"]].map(([l, v]) => (
                      <div key={l} className="rounded bg-surface-2 p-2">
                        <p className="text-[8px] uppercase text-soft-foreground">{l}</p>
                        <p className="tnum text-xs font-semibold text-foreground">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-1.5 flex items-center gap-2 rounded bg-black/20 px-2 py-1.5">
                  <FileText className="size-3.5 text-white/90" />
                  <span className="text-[10px] text-white/90">relatorio-bella.pdf</span>
                </div>
                <p className="px-1 pt-1 text-[11px] text-white/95">Segue o resultado da semana 🚀</p>
                <p className="pr-1 text-right text-[9px] text-white/60">08:00 ✓✓</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ManagerHighlight() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
      <div className="order-2 lg:order-1">
        {/* mock gerenciador */}
        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <BarChart3 className="size-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Campanhas</span>
          </div>
          <div className="divide-y divide-border">
            {[["BF24 — Remarketing", "Ativa", "5,2x"], ["Search — Marca", "Ativa", "6,1x"], ["Advantage+ Aquisição", "Limitada", "3,1x"], ["Topo — Vídeo Reels", "Pausada", "1,6x"]].map(([n, s, r]) => (
              <div key={n} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="flex items-center gap-2 text-foreground">
                  <span className={`size-1.5 rounded-full ${s === "Ativa" ? "bg-success" : s === "Limitada" ? "bg-warning" : "bg-muted-foreground"}`} />
                  {n}
                </span>
                <span className="tnum font-medium text-foreground">{r}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="order-1 lg:order-2">
        <p className="eyebrow">Gerenciador</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          A mesma potência do Meta, sem depender dele
        </h2>
        <p className="mt-4 text-muted-foreground">
          Selecione BM e conta, navegue por campanhas, conjuntos e anúncios, personalize colunas,
          edite orçamento inline e crie campanhas com um assistente completo.
        </p>
        <ul className="mt-6 flex flex-col gap-3">
          {["Colunas personalizáveis e repartições", "Edição de orçamento e ações em massa", "Regras automáticas de otimização"].map((b) => (
            <li key={b} className="flex items-center gap-2.5 text-sm text-foreground">
              <Check className="size-4 text-success" /> {b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const plans = [
  { name: "Starter", price: "R$ 97", desc: "Para quem está começando.", features: ["3 clientes", "1 usuário", "Relatórios manuais", "Painel unificado"], highlight: false },
  { name: "Pro", price: "R$ 297", desc: "Para o gestor em crescimento.", features: ["15 clientes", "5 usuários", "Relatórios no WhatsApp", "Regras automáticas", "White-label"], highlight: true },
  { name: "Agência", price: "R$ 697", desc: "Para times e operações grandes.", features: ["Clientes ilimitados", "20 usuários", "Multi-BM", "CRM completo", "Suporte prioritário"], highlight: false },
];

function Pricing() {
  return (
    <section id="precos" className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Preços</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Planos que crescem com você</h2>
          <p className="mt-3 text-muted-foreground">Comece grátis por 14 dias. Cancele quando quiser.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col rounded-xl border bg-surface p-6 ${p.highlight ? "border-primary shadow-lg" : "border-border"}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">Mais popular</span>
              )}
              <h3 className="font-medium text-foreground">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
                {p.price}<span className="text-sm font-normal text-soft-foreground">/mês</span>
              </p>
              <ul className="mt-5 flex flex-1 flex-col gap-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="size-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant={p.highlight ? "primary" : "outline"} className="mt-6 w-full">
                <Link href="/auth">Começar agora</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const quotes = [
  { q: "Reduzi meu tempo com relatórios de 6h para 20 min por semana. Os clientes amam receber no WhatsApp.", a: "Carla A.", r: "Gestora de tráfego" },
  { q: "Finalmente um lugar com Meta e Google juntos. O gerenciador interno é melhor que o oficial.", a: "Diego M.", r: "Agência de performance" },
  { q: "O CRM e a visão de carteira me deram controle total dos clientes. Virou meu app principal.", a: "Beatriz L.", r: "Freelancer de ads" },
];

function Testimonials() {
  return (
    <section id="depoimentos" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow">Depoimentos</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Gestores que já não vivem sem</h2>
      </div>
      <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {quotes.map((t) => (
          <div key={t.a} className="flex flex-col rounded-xl border border-border bg-surface p-6">
            <div className="flex gap-0.5 text-warning">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
            </div>
            <p className="mt-4 flex-1 text-sm text-foreground">“{t.q}”</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-surface-2 text-xs font-semibold text-foreground">
                {t.a.split(" ").map((x) => x[0]).join("")}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t.a}</p>
                <p className="text-xs text-soft-foreground">{t.r}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const faqs = [
  { q: "Preciso de cartão para testar?", a: "Não. São 14 dias grátis, sem cartão. Você só assina se gostar." },
  { q: "Funciona com Meta Ads e Google Ads?", a: "Sim. Você conecta as contas via OAuth e o AdScape sincroniza campanhas e métricas das duas plataformas, além do GA4." },
  { q: "Como funcionam os relatórios no WhatsApp?", a: "Você configura cliente, período, seções e horário. O relatório é gerado e enviado automaticamente para o número ou grupo do cliente." },
  { q: "Posso usar a marca da minha agência?", a: "Sim. O white-label aplica a marca do cliente/agência nos relatórios e no painel." },
  { q: "Meus dados ficam seguros?", a: "Sim. Autenticação e armazenamento são feitos sobre infraestrutura segura, com permissões por papel na equipe." },
];

function Faq() {
  return (
    <section id="faq" className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-3xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="text-center">
          <p className="eyebrow">FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Perguntas frequentes</h2>
        </div>
        <div className="mt-10 flex flex-col gap-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-lg border border-border bg-surface p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground">
                {f.q}
                <span className="text-soft-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(60% 100% at 50% 100%, var(--primary-soft), transparent 70%)" }} />
      <div className="relative mx-auto max-w-3xl px-5 py-24 text-center lg:px-8">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Comece a operar seu tráfego como um superapp
        </h2>
        <p className="mt-4 text-muted-foreground">14 dias grátis. Sem cartão. Configure em minutos.</p>
        <div className="mt-8 flex justify-center">
          <Button size="lg" asChild>
            <Link href="/auth">Criar conta grátis<ArrowRight /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-sm lg:flex-row lg:px-8">
        <Logo />
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-muted-foreground">
          <a href="#recursos" className="hover:text-foreground">Recursos</a>
          <a href="#precos" className="hover:text-foreground">Preços</a>
          <Link href="/auth" className="hover:text-foreground">Entrar</Link>
          <a href="#" className="hover:text-foreground">Privacidade</a>
          <a href="#" className="hover:text-foreground">Termos</a>
        </div>
        <p className="text-xs text-soft-foreground">© {new Date().getFullYear()} AdScape</p>
      </div>
    </footer>
  );
}
