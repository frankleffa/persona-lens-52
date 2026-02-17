import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ConsolidatedData {
  investment?: number;
  revenue?: number;
  leads?: number;
  messages?: number;
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

const COLORS = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b'];

export default function JourneyFunnelChart({ consolidated, googleAds, metaAds, ga4 }: JourneyFunnelChartProps) {
  const impressions = (googleAds?.impressions || 0) + (metaAds?.impressions || 0);
  const clicks = (googleAds?.clicks || 0) + (metaAds?.clicks || 0);
  const events = ga4?.events || consolidated?.events || 0;
  const messages = consolidated?.messages || metaAds?.messages || 0;

  const data = useMemo(() => [
    { name: 'Impressões', value: impressions },
    { name: 'Cliques', value: clicks },
    { name: 'Eventos', value: events },
    { name: 'Mensagens', value: messages },
  ].filter(d => d.value > 0), [impressions, clicks, events, messages]);

  const totalRate = impressions > 0 && messages > 0
    ? ((messages / impressions) * 100).toFixed(2)
    : impressions > 0 && clicks > 0
    ? ((clicks / impressions) * 100).toFixed(2)
    : "0.00";

  const hasData = data.length > 0;

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between mb-5">
        <p className="kpi-label">Funil da Jornada</p>
      </div>

      {!hasData ? (
        <div className="flex h-[300px] items-center justify-center">
          <p className="text-sm text-muted-foreground">Sem dados de funil no período selecionado.</p>
        </div>
      ) : (
        <div className="relative">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  fontSize: 13,
                  color: "var(--text-primary)",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                }}
                formatter={(value: number) => value.toLocaleString('pt-BR')}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 30 }}>
            <div className="text-center">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Taxa Total</p>
              <p className="text-lg font-bold text-foreground">{totalRate}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
