import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, ChevronRight, Zap, BarChart3, Eye, RefreshCw, Palette, ArrowRight } from "lucide-react";
import ScreenshotsSection from "@/components/landing/ScreenshotsSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";

interface LandingContent {
  hero_title: string;
  hero_subtitle: string;
  hero_cta: string;
  pain_title: string;
  pain_items: string[];
  pain_conclusion: string;
  solution_title: string;
  solution_text: string;
  benefits: string[];
  steps_title: string;
  steps: string[];
  plan_title: string;
  plan_price: string;
  plan_features: string[];
  plan_cta: string;
  final_cta_title: string;
  final_cta_button: string;
}

const defaultContent: LandingContent = {
  hero_title: "Você roda tráfego profissional.\nPor que apresenta como amador?",
  hero_subtitle: "Pare de mandar PDF, planilha ou print do gerenciador.\nMostre seus resultados em um dashboard visual e organizado, em tempo real.",
  hero_cta: "Quero mostrar meus resultados direito",
  pain_title: "Se você ainda faz isso…",
  pain_items: ["Envia relatório em PDF todo mês", "Tira print do Ads", "Monta planilha manual", "Explica número por número no WhatsApp"],
  pain_conclusion: "Você está perdendo autoridade.",
  solution_title: "Resultados bons merecem apresentação boa.",
  solution_text: "Organize Google Ads, Meta Ads e GA4 em um único painel visual. Seus clientes acessam os resultados em tempo real, sem precisar de PDF, planilha ou print.",
  benefits: ["Consolidado geral de investimento e resultados", "Separação por plataforma", "Controle do que o cliente pode ver", "Dados atualizados em tempo real", "Visual limpo e profissional"],
  steps_title: "Como funciona",
  steps: ["Conecte suas contas", "Selecione quais entram no painel", "Crie o cliente", "Compartilhe o acesso"],
  plan_title: "Plano Fundadores",
  plan_price: "R$97/mês",
  plan_features: ["Até 3 clientes", "Google + Meta + GA4", "Dashboard completo", "Controle por cliente"],
  plan_cta: "Começar agora",
  final_cta_title: "Se seus resultados são profissionais,\nsua apresentação também deveria ser.",
  final_cta_button: "Quero parar de mandar PDF",
};

const stepIcons = [Zap, BarChart3, Eye, RefreshCw];

export default function LandingPage() {
  const [content, setContent] = useState<LandingContent>(defaultContent);

  useEffect(() => {
    supabase
      .from("landing_page_content")
      .select("content")
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.content) {
          setContent(data[0].content as unknown as LandingContent);
        }
      });
  }, []);

  const renderMultiline = (text: string) =>
    text.split("\n").map((line, i) => (
      <span key={i}>
        {line}
        {i < text.split("\n").length - 1 && <br />}
      </span>
    ));

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center px-6 py-28 md:py-40 text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
        <h1 className="relative z-10 max-w-3xl text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
          {renderMultiline(content.hero_title)}
        </h1>
        <p className="relative z-10 mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground leading-relaxed">
          {renderMultiline(content.hero_subtitle)}
        </p>
        <Button size="lg" className="relative z-10 mt-10 text-base px-8 py-6 rounded-full font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
          {content.hero_cta}
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </section>

      {/* PAIN */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{content.pain_title}</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {content.pain_items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-left text-sm md:text-base text-muted-foreground"
              >
                <span className="shrink-0 text-destructive text-lg">✕</span>
                {item}
              </div>
            ))}
          </div>
          <p className="mt-10 text-2xl md:text-3xl font-bold text-destructive">
            {content.pain_conclusion}
          </p>
        </div>
      </section>

      {/* SOLUTION */}
      <section className="px-6 py-20 md:py-28 bg-card/50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight gradient-text">
            {content.solution_title}
          </h2>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            {content.solution_text}
          </p>
        </div>
      </section>

      {/* SCREENSHOTS */}
      <ScreenshotsSection />

      {/* BENEFITS */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-12">
            Tudo em um só lugar
          </h2>
          <div className="space-y-4">
            {content.benefits.map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-6 py-5 transition-colors hover:border-primary/30"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15">
                  <Check className="h-4 w-4 text-primary" />
                </div>
                <span className="text-base md:text-lg">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-6 py-20 md:py-28 bg-card/50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-14">
            {content.steps_title}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {content.steps.map((step, i) => {
              const Icon = stepIcons[i] || Zap;
              return (
                <div key={i} className="relative flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-6">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {i + 1}
                  </div>
                  <Icon className="mt-4 h-8 w-8 text-primary/70" />
                  <span className="text-sm font-medium">{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <TestimonialsSection />

      {/* PLAN */}
      <section className="px-6 py-20 md:py-28">
        <div className="mx-auto max-w-md text-center">
          <div className="rounded-2xl border-2 border-primary/40 bg-card p-8 md:p-10 shadow-lg shadow-primary/10">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Oferta Especial</p>
            <h3 className="text-2xl md:text-3xl font-bold">{content.plan_title}</h3>
            <p className="mt-4 text-5xl font-extrabold gradient-text">{content.plan_price}</p>
            <div className="mt-8 space-y-3 text-left">
              {content.plan_features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-accent shrink-0" />
                  <span className="text-muted-foreground">{f}</span>
                </div>
              ))}
            </div>
            <Button size="lg" className="mt-8 w-full rounded-full py-6 text-base font-semibold shadow-lg shadow-primary/25">
              {content.plan_cta}
              <ChevronRight className="ml-1 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 py-20 md:py-28 bg-card/50">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {renderMultiline(content.final_cta_title)}
          </h2>
          <Button size="lg" className="mt-10 rounded-full px-10 py-6 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
            {content.final_cta_button}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} — Todos os direitos reservados.
      </footer>
    </div>
  );
}
