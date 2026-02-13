import dashboardOverview from "@/assets/dashboard-overview.jpg";
import dashboardCampaigns from "@/assets/dashboard-campaigns.jpg";
import dashboardFunnel from "@/assets/dashboard-funnel.jpg";

const screenshots = [
  { src: dashboardOverview, alt: "Visão geral do dashboard com KPIs e gráfico de conversões", label: "Consolidado Executivo" },
  { src: dashboardCampaigns, alt: "Tabela de performance de campanhas", label: "Campanhas por Plataforma" },
  { src: dashboardFunnel, alt: "Funil de marketing e atribuição por canal", label: "Funil & Atribuição" },
];

export default function ScreenshotsSection() {
  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl md:text-4xl font-bold tracking-tight mb-4">
          Veja como seus dados aparecem
        </h2>
        <p className="text-center text-muted-foreground text-lg mb-14 max-w-2xl mx-auto">
          Dashboards profissionais que impressionam seus clientes — sem precisar montar nada.
        </p>
        <div className="space-y-10">
          {screenshots.map((shot, i) => (
            <div key={i} className="group relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm" />
              <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5">
                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/30">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-destructive/60" />
                    <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                    <span className="h-3 w-3 rounded-full bg-green-500/60" />
                  </div>
                  <span className="ml-2 text-xs text-muted-foreground font-medium">{shot.label}</span>
                </div>
                <img
                  src={shot.src}
                  alt={shot.alt}
                  className="w-full h-auto"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
