import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { CampaignsTable } from "@/components/dashboard/campaigns-table";
import { kpis } from "@/components/dashboard/data";

const platformMix = [
  { name: "Meta Ads", value: 54, color: "var(--chart-1)" },
  { name: "Google Ads", value: 33, color: "var(--chart-3)" },
  { name: "Outros", value: 13, color: "var(--muted-foreground)" },
];

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      {/* Cabeçalho editorial */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-in">
        <div>
          <p className="eyebrow">Visão geral</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Performance consolidada de Google Ads, Meta Ads e GA4.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-soft-foreground">
          <span className="size-1.5 rounded-full bg-success" />
          Sincronizado há 4 min
        </div>
      </div>

      {/* KPIs — blocos de métrica */}
      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6 animate-rise">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.key} kpi={kpi} />
        ))}
      </section>

      {/* Gráfico + mix */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Desempenho</p>
              <h2 className="mt-1 text-sm font-medium text-foreground">
                Investimento × Receita
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--chart-1)]" />
                Receita
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--muted-foreground)]" />
                Investimento
              </span>
            </div>
          </div>
          <OverviewChart />
        </Card>

        <Card className="p-5">
          <p className="eyebrow">Distribuição</p>
          <h2 className="mt-1 text-sm font-medium text-foreground">
            Mix por plataforma
          </h2>
          <div className="mt-6 flex flex-col gap-5">
            {platformMix.map((p) => (
              <div key={p.name}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{p.name}</span>
                  <span className="tnum font-medium text-foreground">{p.value}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${p.value}%`, background: p.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* Tabela de campanhas */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow">Campanhas</p>
            <h2 className="mt-1 text-sm font-medium text-foreground">
              Top campanhas no período
            </h2>
          </div>
        </div>
        <CampaignsTable />
      </Card>

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Dados ilustrativos — o backend será reconectado em seguida.
      </p>
    </>
  );
}
