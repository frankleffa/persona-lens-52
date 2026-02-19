import { useMemo } from "react";

interface ConsolidatedData {
  investment?: number;
  revenue?: number;
  leads?: number;
  messages?: number;
  purchases?: number;
  registrations?: number;
  cpa?: number;
  ctr?: number;
  cpc?: number;
  conversion_rate?: number;
  sessions?: number;
  events?: number;
}

interface GoogleAdsData {
  impressions?: number;
  clicks?: number;
  conversions?: number;
}

interface MetaAdsData {
  impressions?: number;
  clicks?: number;
  leads?: number;
  messages?: number;
  purchases?: number;
  registrations?: number;
}

interface GA4Data {
  sessions?: number;
  events?: number;
}

interface JourneyFunnelChartProps {
  consolidated?: ConsolidatedData | null;
  googleAds?: GoogleAdsData | null;
  metaAds?: MetaAdsData | null;
  ga4?: GA4Data | null;
}

const STAGE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export default function JourneyFunnelChart({ consolidated, googleAds, metaAds, ga4 }: JourneyFunnelChartProps) {
  const impressions = (googleAds?.impressions || 0) + (metaAds?.impressions || 0);
  const clicks = (googleAds?.clicks || 0) + (metaAds?.clicks || 0);
  const events = ga4?.events || consolidated?.events || 0;
  const messages = consolidated?.messages || metaAds?.messages || 0;
  const purchases = consolidated?.purchases || metaAds?.purchases || 0;
  const registrations = consolidated?.registrations || metaAds?.registrations || 0;

  // Use the best conversion metric available as the final stage
  const conversions = Math.max(messages, purchases, registrations);
  const conversionLabel =
    purchases > 0 && purchases >= Math.max(messages, registrations)
      ? "Compras"
      : registrations > 0 && registrations >= Math.max(messages, purchases)
      ? "Cadastros"
      : "Mensagens";

  const rawStages = useMemo(() => {
    const all = [
      { name: "Impressões", value: impressions },
      { name: "Cliques", value: clicks },
      { name: "Eventos", value: events },
      { name: conversionLabel, value: conversions },
    ];
    // Remove stages with 0, but keep contiguous from the top
    const result: { name: string; value: number }[] = [];
    for (const s of all) {
      if (s.value > 0) result.push(s);
    }
    return result;
  }, [impressions, clicks, events, conversions, conversionLabel]);

  const hasData = rawStages.length > 0;
  const maxValue = rawStages[0]?.value || 1;

  // Calculate rate from first stage to last
  const firstVal = rawStages[0]?.value || 0;
  const lastVal = rawStages[rawStages.length - 1]?.value || 0;
  const isOnlyCTR = rawStages.length === 2 && rawStages[1]?.name === "Cliques";
  const totalRateLabel = isOnlyCTR ? "CTR" : "Conv. Total";
  const totalRate =
    firstVal > 0 && lastVal > 0 ? ((lastVal / firstVal) * 100).toFixed(2) : "0.00";

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between mb-5">
        <p className="kpi-label">Funil da Jornada</p>
        {hasData && (
          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{totalRateLabel}</p>
            <p className="text-lg font-bold text-foreground">{totalRate}%</p>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex h-[220px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Sem dados de funil no período selecionado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rawStages.map((stage, index) => {
            const widthPct = (stage.value / maxValue) * 100;
            const prevVal = index > 0 ? rawStages[index - 1].value : null;
            const stageRate =
              prevVal && prevVal > 0
                ? ((stage.value / prevVal) * 100).toFixed(1)
                : null;

            return (
              <div key={stage.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-sm shrink-0"
                      style={{ backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length] }}
                    />
                    <span className="font-medium text-foreground">{stage.name}</span>
                    {stageRate && (
                      <span className="text-muted-foreground">← {stageRate}%</span>
                    )}
                  </div>
                  <span className="font-mono text-muted-foreground tabular-nums">
                    {stage.value.toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="h-6 w-full rounded bg-muted overflow-hidden">
                  <div
                    className="h-full rounded transition-all duration-700"
                    style={{
                      width: `${widthPct}%`,
                      backgroundColor: STAGE_COLORS[index % STAGE_COLORS.length],
                      opacity: 0.85,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
