import { useState } from "react";
import HourlyConversionsChart from "@/components/HourlyConversionsChart";
import GeoConversionsChart from "@/components/GeoConversionsChart";

interface ConversionsPanelProps {
  hourlyData?: {
    purchases_by_hour?: Record<string, number>;
    registrations_by_hour?: Record<string, number>;
  } | null;
  geoData?: Record<string, { purchases: number; registrations: number; messages: number; spend: number }> | null;
}

type TabType = "hourly" | "geo";

export default function ConversionsPanel({ hourlyData, geoData }: ConversionsPanelProps) {
  const [tab, setTab] = useState<TabType>("hourly");

  return (
    <div className="card-executive p-6 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <div className="flex items-center justify-between mb-5">
        <p className="kpi-label">Conversões</p>
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            onClick={() => setTab("hourly")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "hourly"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Por Hora
          </button>
          <button
            onClick={() => setTab("geo")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === "geo"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Por GEO
          </button>
        </div>
      </div>

      {tab === "hourly" ? (
        <HourlyConversionsChart data={hourlyData} embedded />
      ) : (
        <GeoConversionsChart data={geoData} />
      )}
    </div>
  );
}
