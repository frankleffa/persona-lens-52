import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, MessageCircle, UserCheck, LayoutDashboard, Check, Lock } from "lucide-react";
import { motion, type Variants } from "framer-motion";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } },
};

export default function LandingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;600;700;800&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden" style={{ fontFamily: "'Manrope', sans-serif" }}>

      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#020818] to-black" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(circle_at_center,black_40%,transparent_80%)]" />
      </div>

      {/* Gradient blur top */}
      <div className="fixed z-40 inset-x-0 top-0 h-[120px] pointer-events-none bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm [mask-image:linear-gradient(to_bottom,black,transparent)]" />

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 w-full z-50 pt-6 px-4">
        <nav className="max-w-5xl mx-auto flex items-center justify-between bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3B82F6]" />
            <span className="text-lg font-bold tracking-tight">AdScape</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Features</a>
            <a href="#como-funciona" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Como funciona</a>
            <a href="#pricing" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/auth")} className="hidden md:block text-sm font-medium text-zinc-300 hover:text-white transition-colors">Entrar</button>
            <button onClick={() => navigate("/auth")} className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-white/5 px-6 py-2 transition-transform active:scale-95">
              <span className="absolute inset-0 border border-white/10 rounded-full" />
              <span className="absolute inset-[1px] rounded-full bg-black" />
              <span className="relative z-10 flex items-center gap-2 text-xs font-bold uppercase tracking-wider">Começar grátis <ArrowRight className="w-3 h-3" /></span>
            </button>
          </div>
        </nav>
      </header>

      <main className="relative z-10">

        {/* HERO */}
        <section className="min-h-screen flex flex-col items-center justify-center pt-32 pb-20 px-6">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="text-center max-w-5xl mx-auto">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
              </span>
              <span className="text-xs font-medium text-blue-100/90 tracking-wide">IA integrada ao tráfego pago</span>
              <ArrowRight className="w-3 h-3 text-blue-400" />
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-6xl md:text-8xl font-semibold tracking-tighter leading-[1.05] mb-8">
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">Sua agência merece</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/40">
                um dashboard <span className="text-blue-500 relative">mais inteligente</span>
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg sm:text-xl md:text-2xl text-zinc-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Meta Ads, Google Ads e GA4 em um só lugar. Com IA que analisa suas campanhas e diz exatamente o que fazer.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col md:flex-row items-center justify-center gap-6">
              <button onClick={() => navigate("/auth")} className="shiny-cta group relative overflow-hidden rounded-full px-10 py-4 border-2 border-transparent bg-black cursor-pointer" style={{ background: "linear-gradient(#000,#000) padding-box, conic-gradient(from 0deg,transparent 0%,#3B82F6 5%,#60A5FA 15%,#3B82F6 30%,transparent 40%,transparent 100%) border-box", animation: "border-spin 2.5s linear infinite" }}>
                <span className="relative z-10 flex items-center gap-2 text-white font-bold">Testar grátis por 7 dias <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" /></span>
              </button>
              <div className="text-sm text-zinc-500 flex items-center gap-1"><Lock className="w-3 h-3" /> depois R$97/mês · cancele quando quiser</div>
            </motion.div>

            {/* Dashboard Mockup */}
            <motion.div variants={scaleIn} className="mt-20">
              <div className="relative max-w-4xl mx-auto">
                <div className="absolute inset-0 bg-blue-500/10 blur-[60px] rounded-3xl" />
                <div className="relative bg-zinc-900/80 backdrop-blur border border-white/10 rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8)]">
                  <div className="bg-zinc-900 px-4 py-3 flex items-center gap-3 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                      <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                      <div className="w-3 h-3 rounded-full bg-[#28C840]" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="font-mono text-xs text-zinc-500 bg-white/5 px-4 py-1 rounded-md">adscape.com.br/dashboard</span>
                    </div>
                  </div>
                  <div className="p-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { label: "Investimento", value: "R$4.423", change: "↑ 12.4%", color: "text-green-400" },
                      { label: "Cliques", value: "5.280", change: "↑ 8.1%", color: "text-green-400" },
                      { label: "Conversões", value: "142", change: "↑ 23.5%", color: "text-green-400" },
                      { label: "ROAS", value: "4.58x", change: "↑ 0.8x", color: "text-green-400" },
                      { label: "CPA", value: "R$31", change: "↓ 4.2%", color: "text-red-400" },
                    ].map((m) => (
                      <div key={m.label} className="bg-black/60 border border-white/5 rounded-xl p-4">
                        <div className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 mb-2">{m.label}</div>
                        <div className="font-mono text-xl font-medium">{m.value}</div>
                        <div className={`font-mono text-xs ${m.color} mt-1`}>{m.change}</div>
                      </div>
                    ))}
                    <div className="col-span-2 sm:col-span-5 bg-black/60 border border-white/5 rounded-xl p-4 h-28 overflow-hidden">
                      <svg viewBox="0 0 900 80" preserveAspectRatio="none" className="w-full h-full">
                        <defs>
                          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d="M0,70 L100,55 L200,60 L300,35 L400,45 L500,20 L600,30 L700,15 L800,25 L900,18 L900,80 L0,80Z" fill="url(#g1)" />
                        <path d="M0,70 L100,55 L200,60 L300,35 L400,45 L500,20 L600,30 L700,15 L800,25 L900,18" fill="none" stroke="#3B82F6" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Logo strip */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="w-full mt-24 border-y border-white/5 bg-white/[0.02] py-8 opacity-50 hover:opacity-100 transition-opacity">
            <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center gap-6 md:gap-16">
              <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase shrink-0">Integrado com:</p>
              <div className="flex flex-wrap justify-center gap-10 items-center w-full text-zinc-400 font-semibold text-sm">
                <span>Meta Ads</span>
                <span>Google Ads</span>
                <span>GA4</span>
                <span>WhatsApp</span>
                <span>Claude AI</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* FEATURES BENTO */}
        <section id="features" className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="mb-20 text-center max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter mb-6">O sistema operacional para<br /><span className="text-blue-500">gestores de tráfego</span></h2>
              <p className="text-lg text-zinc-400 font-light">Substitua suas 5 abas abertas por uma plataforma inteligente.</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* IA - main */}
              <motion.div variants={fadeUp} className="lg:col-span-2 lg:row-span-2 group relative overflow-hidden p-8 border border-white/10 bg-gradient-to-b from-zinc-900/50 to-black hover:border-blue-500/30 transition-all rounded-xl">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_70%)]" />
                <div className="relative z-10 h-full flex flex-col">
                  <div className="mb-6 inline-flex p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 w-fit">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-3xl font-semibold tracking-tight mb-4">IA que analisa e recomenda</h3>
                  <p className="text-zinc-400 text-lg leading-relaxed mb-6">Com um clique, o AdScape lê todos os dados reais e gera insights acionáveis com os números das suas campanhas.</p>
                  <div className="mt-auto space-y-2">
                    {[
                      { color: "bg-red-400 shadow-[0_0_6px_#f87171]", title: "Pausar campanha VIRGINIA", sub: "R$412 gastos · zero conversões", badge: "Alerta", badgeClass: "bg-red-500/10 text-red-400 border-red-500/20" },
                      { color: "bg-blue-400 shadow-[0_0_6px_#60a5fa]", title: "Escalar ESTÁTICOS FILIPE", sub: "CPA R$7,93 · ROAS 4,58x · 33 conv.", badge: "Oport.", badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
                      { color: "bg-yellow-400 shadow-[0_0_6px_#fbbf24]", title: "Replicar Corinthians duplic.", sub: "ROAS 6,42x vs original 0,18x", badge: "Otim.", badgeClass: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
                    ].map((item) => (
                      <div key={item.title} className="flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-lg p-3">
                        <div className={`w-2 h-2 rounded-full ${item.color} mt-1 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold mb-0.5">{item.title}</div>
                          <div className="font-mono text-[10px] text-zinc-500">{item.sub}</div>
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${item.badgeClass} border shrink-0`}>{item.badge}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              {/* WhatsApp */}
              <motion.div variants={fadeUp} className="lg:col-span-2 group relative overflow-hidden p-8 border border-white/10 bg-black hover:border-green-500/20 transition-all rounded-xl">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.06),transparent_70%)]" />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400">
                    <MessageCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2">Relatórios automáticos via WhatsApp</h3>
                  <p className="text-zinc-400 text-sm">Configure uma vez, esqueça. Resumo de performance chega direto no WhatsApp do cliente toda semana.</p>
                </div>
              </motion.div>

              {/* Portal */}
              <motion.div variants={fadeUp} className="group relative overflow-hidden p-8 border border-white/10 bg-black hover:border-purple-500/20 transition-all rounded-xl">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.06),transparent_70%)]" />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Portal do cliente</h3>
                  <p className="text-sm text-zinc-400">Cada cliente com login próprio, vendo só o que você quer mostrar.</p>
                </div>
              </motion.div>

              {/* Dashboard */}
              <motion.div variants={fadeUp} className="group relative overflow-hidden p-8 border border-white/10 bg-black hover:border-blue-500/20 transition-all rounded-xl">
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.06),transparent_70%)]" />
                <div className="relative z-10">
                  <div className="mb-4 inline-flex p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <LayoutDashboard className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Dashboard unificado</h3>
                  <p className="text-sm text-zinc-400">Meta, Google e GA4 em uma tela. Sem trocar de aba.</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* TESTIMONIAL BANNER */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="w-full bg-blue-600 py-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="text-black text-xl mb-6 tracking-widest">★★★★★</div>
            <h3 className="text-3xl md:text-5xl font-bold leading-tight mb-8 text-black">"A IA identificou uma campanha desperdiçando R$800/mês que eu não tinha visto. Pagou o AdScape 8x no primeiro mês."</h3>
            <div className="flex items-center justify-center gap-4">
              <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center font-bold text-black text-lg">AC</div>
              <div className="text-left">
                <div className="font-bold text-black text-lg">Ana C.</div>
                <div className="text-black/70">Agência de Performance · RJ</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* HOW IT WORKS */}
        <section id="como-funciona" className="py-32 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter mb-4">Configurado em minutos</h2>
              <p className="text-zinc-400">Sem precisar saber programar.</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
              <div className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              {[
                { num: "01", title: "Crie sua conta", desc: "Sem cartão. 7 dias grátis." },
                { num: "02", title: "Conecte as plataformas", desc: "Meta, Google e GA4 via login." },
                { num: "03", title: "Adicione seus clientes", desc: "Crie perfis e vincule as contas." },
                { num: "04", title: "Deixe a IA trabalhar", desc: "Insights e relatórios automáticos." },
              ].map((step) => (
                <motion.div key={step.num} variants={fadeUp} className="text-center">
                  <div className="w-14 h-14 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center font-mono text-blue-400 text-lg mx-auto mb-5 relative z-10">{step.num}</div>
                  <h4 className="font-bold mb-2">{step.title}</h4>
                  <p className="text-sm text-zinc-500">{step.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-32 px-6 bg-zinc-950/40 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-semibold tracking-tighter mb-4">Simples e direto</h2>
              <p className="text-zinc-400">Um plano. Sem pegadinhas. Sem cobranças escondidas.</p>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={scaleIn} className="max-w-md mx-auto relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1 rounded-full z-10">Mais popular</div>
              <div className="relative p-10 border border-blue-500/40 bg-zinc-900/40 shadow-[0_0_60px_rgba(59,130,246,0.1)] rounded-2xl">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent rounded-t-2xl" />
                <h3 className="text-2xl font-bold mb-1">Plano Gestor</h3>
                <p className="text-zinc-500 text-sm mb-8">Para gestores e agências de até 5 clientes</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-zinc-500 text-xl">R$</span>
                  <span className="font-mono text-7xl font-medium leading-none">97</span>
                  <span className="text-zinc-500">/mês</span>
                </div>
                <ul className="space-y-4 mb-10">
                  {[
                    { text: <><strong className="text-white">Até 5 clientes</strong> simultâneos</> },
                    { text: "Meta Ads + Google Ads + GA4" },
                    { text: <><strong className="text-white">IA que analisa</strong> suas campanhas</> },
                    { text: <><strong className="text-white">Relatórios automáticos</strong> via WhatsApp</> },
                    { text: "Portal do cliente com login próprio" },
                    { text: "Kanban de execução de tarefas" },
                    { text: "Score de saúde por cliente" },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                      <Check className="w-4 h-4 text-blue-400 shrink-0" />
                      {item.text}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate("/auth")} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:shadow-[0_0_40px_rgba(59,130,246,0.5)]">
                  Começar 7 dias grátis →
                </button>
                <p className="text-center text-xs text-zinc-600 mt-4 flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> Sem cartão · Cancele quando quiser
                </p>
              </div>
            </motion.div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-32 px-6 border-t border-white/5">
          <div className="max-w-5xl mx-auto">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} className="text-center mb-16">
              <h2 className="text-4xl font-semibold tracking-tighter mb-4">Gestores que já usam</h2>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.1 }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { initials: "MR", name: "Marcos R.", role: "Gestor de Tráfego · SP", quote: <>Economizo pelo menos <span className="text-white not-italic font-semibold">3 horas por semana</span> que gastava consolidando relatórios.</>, gradient: "from-blue-500 to-blue-700" },
                { initials: "AC", name: "Ana C.", role: "Agência de Performance · RJ", quote: <>A IA identificou campanha desperdiçando <span className="text-white not-italic font-semibold">R$800/mês</span>. Pagou 8x o AdScape no primeiro mês.</>, gradient: "from-purple-500 to-purple-700" },
                { initials: "FT", name: "Felipe T.", role: "Freelancer · BH", quote: <>O <span className="text-white not-italic font-semibold">portal com login próprio</span> me diferencia de gestores que ainda mandam print no WhatsApp.</>, gradient: "from-green-500 to-green-700" },
              ].map((t) => (
                <motion.div key={t.initials} variants={fadeUp} className="p-7 border border-white/10 bg-zinc-900/30 rounded-xl hover:border-white/20 transition-all">
                  <div className="text-yellow-400 text-sm mb-4">★★★★★</div>
                  <p className="text-zinc-400 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center font-bold text-sm`}>{t.initials}</div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-zinc-500">{t.role}</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="py-32 px-6 text-center bg-zinc-950/40 border-t border-white/5">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} variants={staggerContainer} className="max-w-3xl mx-auto">
            <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-bold tracking-tighter mb-8">Pronto para <span className="text-blue-500">escalar?</span></motion.h2>
            <motion.p variants={fadeUp} className="text-xl text-zinc-400 mb-12">7 dias grátis. Sem cartão. Sem compromisso.</motion.p>
            <motion.div variants={fadeUp} className="max-w-md mx-auto flex flex-col sm:flex-row gap-4">
              <input type="email" placeholder="seu@email.com" className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-4 text-white focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600" />
              <button onClick={() => navigate("/auth")} className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full px-8 py-4 transition-all shadow-[0_0_30px_rgba(59,130,246,0.3)]">Começar grátis</button>
            </motion.div>
          </motion.div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-black border-t border-zinc-900 pt-20 pb-10 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-24 relative z-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_#3B82F6]" />
              <span className="text-2xl font-bold tracking-tight">AdScape</span>
            </div>
            <p className="text-zinc-500 max-w-xs leading-relaxed text-sm">Dashboard de tráfego pago com IA para gestores e agências que querem resultados melhores.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6">Produto</h4>
            <ul className="space-y-4 text-zinc-400 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Preços</a></li>
              <li><a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-6">Legal</h4>
            <ul className="space-y-4 text-zinc-400 text-sm">
              <li><a href="/privacy-policy" className="hover:text-white transition-colors">Privacidade</a></li>
              <li><a href="/terms-of-service" className="hover:text-white transition-colors">Termos de Uso</a></li>
            </ul>
          </div>
        </div>
        <div className="flex justify-center items-center py-10 opacity-[0.06] pointer-events-none">
          <h1 className="text-[15vw] leading-none font-bold tracking-tighter select-none" style={{ WebkitTextStroke: "1px rgba(255,255,255,0.08)", color: "transparent" }}>ADSCAPE</h1>
        </div>
        <div className="max-w-6xl mx-auto px-6 border-t border-zinc-900 pt-8 flex flex-col md:flex-row items-center justify-between text-zinc-600 text-[10px] uppercase tracking-widest">
          <p>© {new Date().getFullYear()} AdScape</p>
          <p className="mt-4 md:mt-0">Feito para gestores de tráfego brasileiros</p>
        </div>
      </footer>

      <style>{`
        @keyframes border-spin {
          from { --gradient-angle: 0deg; }
          to { --gradient-angle: 360deg; }
        }
        @property --gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
      `}</style>
    </div>
  );
}
