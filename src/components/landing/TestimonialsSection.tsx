import { Quote } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "Eu precisava de uma forma mais profissional de mostrar os resultados para um cliente que queria acompanhar os dados em tempo real. Mandar PDF ou print já não fazia sentido. O dashboard resolveu isso de forma simples: conectei as contas, organizei as métricas e o cliente passou a acompanhar tudo sozinho. Além de ganhar tempo, eu ganhei mais autoridade na apresentação.",
    name: "Frank Leffa",
    role: "Gestor de Tráfego",
    initials: "FL",
  },
  {
    quote:
      "Eu sempre tive dificuldade em organizar os dados para apresentar aos clientes. Ficava tudo espalhado entre Google, Meta e Analytics. Depois que comecei a usar a plataforma, ficou muito mais claro mostrar o que realmente importa. Me ajudou a parecer mais profissional e reduziu bastante o tempo que eu gastava montando relatório.",
    name: "César",
    role: "Gestor de Performance",
    initials: "C",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="px-6 py-20 md:py-28 bg-card/50">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Quem usa, recomenda
        </h2>
        <p className="text-center text-muted-foreground text-lg mb-14 max-w-2xl mx-auto">
          Veja o que gestores de tráfego estão dizendo sobre a plataforma.
        </p>
        <div className="grid gap-8 md:grid-cols-2">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="relative rounded-2xl border border-border bg-card p-8 transition-colors hover:border-primary/30"
            >
              <Quote className="absolute top-6 right-6 h-8 w-8 text-primary/15" />
              <p className="text-sm md:text-base leading-relaxed text-muted-foreground italic">
                "{t.quote}"
              </p>
              <div className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
