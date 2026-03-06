import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { Tooltip as ReactTooltip } from "react-simple-maps";

const WORLD_GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const BRAZIL_GEO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

interface GeoData {
  purchases: number;
  registrations: number;
  messages: number;
  spend: number;
}

type GeoRecord = Record<string, GeoData>;
type MetricType = "purchases" | "registrations" | "messages" | "spend";

interface GeoMapChartProps {
  data?: GeoRecord | null;
  dataRegion?: GeoRecord | null;
  metric: MetricType;
  level: "country" | "region" | "city";
}

const COUNTRY_ISO_MAP: Record<string, string> = {
  BR: "076", US: "840", PT: "620", AR: "032", MX: "484",
  CO: "170", CL: "152", UY: "858", PE: "604", ES: "724",
  GB: "826", DE: "276", FR: "250", IT: "380", CA: "124",
  JP: "392", AU: "036", IN: "356",
};

const COUNTRY_NAMES: Record<string, string> = {
  BR: "Brasil", US: "EUA", PT: "Portugal", AR: "Argentina", MX: "México",
  CO: "Colômbia", CL: "Chile", UY: "Uruguai", PE: "Peru", ES: "Espanha",
  GB: "Reino Unido", DE: "Alemanha", FR: "França", IT: "Itália", CA: "Canadá",
  JP: "Japão", AU: "Austrália", IN: "Índia",
};

// Brazilian state name normalization
const BR_STATE_MAP: Record<string, string> = {
  "acre": "Acre", "alagoas": "Alagoas", "amapá": "Amapá", "amazonas": "Amazonas",
  "bahia": "Bahia", "ceará": "Ceará", "distrito federal": "Distrito Federal",
  "espírito santo": "Espírito Santo", "goiás": "Goiás", "maranhão": "Maranhão",
  "mato grosso": "Mato Grosso", "mato grosso do sul": "Mato Grosso do Sul",
  "minas gerais": "Minas Gerais", "pará": "Pará", "paraíba": "Paraíba",
  "paraná": "Paraná", "pernambuco": "Pernambuco", "piauí": "Piauí",
  "rio de janeiro": "Rio de Janeiro", "rio grande do norte": "Rio Grande do Norte",
  "rio grande do sul": "Rio Grande do Sul", "rondônia": "Rondônia",
  "roraima": "Roraima", "santa catarina": "Santa Catarina",
  "são paulo": "São Paulo", "sergipe": "Sergipe", "tocantins": "Tocantins",
};

const METRIC_LABELS: Record<MetricType, string> = {
  purchases: "Compras",
  registrations: "Cadastros",
  messages: "Mensagens",
  spend: "Investimento",
};

function formatValue(value: number, metric: MetricType) {
  if (metric === "spend") {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }
  return value.toLocaleString("pt-BR");
}

export default function GeoMapChart({ data, dataRegion, metric, level }: GeoMapChartProps) {
  const [tooltipContent, setTooltipContent] = useState("");

  const isRegionLevel = level === "region";
  const activeData = isRegionLevel ? dataRegion : data;

  // Check if data is mostly Brazil for region view
  const isBrazilFocused = useMemo(() => {
    if (!data) return false;
    const brValue = data["BR"]?.[metric] || 0;
    const total = Object.values(data).reduce((sum, d) => sum + (d[metric] || 0), 0);
    return total > 0 && brValue / total > 0.5;
  }, [data, metric]);

  // Build lookup for country-level by ISO numeric
  const countryLookup = useMemo(() => {
    if (!data || isRegionLevel) return {};
    const lookup: Record<string, number> = {};
    Object.entries(data).forEach(([code, values]) => {
      const isoNum = COUNTRY_ISO_MAP[code];
      if (isoNum) lookup[isoNum] = values[metric] || 0;
    });
    return lookup;
  }, [data, metric, isRegionLevel]);

  // Build lookup for region-level by state name
  const regionLookup = useMemo(() => {
    if (!dataRegion || !isRegionLevel) return {};
    const lookup: Record<string, number> = {};
    Object.entries(dataRegion).forEach(([name, values]) => {
      const normalized = name.toLowerCase().trim();
      const canonical = BR_STATE_MAP[normalized] || name;
      lookup[canonical.toLowerCase()] = values[metric] || 0;
    });
    return lookup;
  }, [dataRegion, metric, isRegionLevel]);

  const maxValue = useMemo(() => {
    const vals = isRegionLevel ? Object.values(regionLookup) : Object.values(countryLookup);
    return Math.max(...vals, 1);
  }, [countryLookup, regionLookup, isRegionLevel]);

  const getColor = (value: number) => {
    if (value === 0) return "hsl(var(--muted) / 0.15)";
    const intensity = Math.max(0.15, Math.min(1, value / maxValue));
    return `hsl(var(--primary) / ${intensity})`;
  };

  if (level === "city") {
    return (
      <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-[13px] text-muted-foreground/50">
          Visualização de mapa não disponível para cidades. Use o gráfico de barras.
        </p>
      </div>
    );
  }

  if (!activeData || Object.keys(activeData).length === 0) {
    return (
      <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-border">
        <p className="text-[13px] text-muted-foreground/50">
          Sem dados geográficos no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {tooltipContent && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-lg">
          {tooltipContent}
        </div>
      )}
      <div className="h-[300px] w-full">
        {isRegionLevel && isBrazilFocused ? (
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 600,
              center: [-54, -15],
            }}
            width={800}
            height={500}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={BRAZIL_GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = (geo.properties.name || "").toLowerCase();
                  const value = regionLookup[stateName] || 0;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={getColor(value)}
                      stroke="hsl(var(--border))"
                      strokeWidth={0.5}
                      onMouseEnter={() => {
                        const name = geo.properties.name || "Desconhecido";
                        setTooltipContent(`${name}: ${formatValue(value, metric)} ${METRIC_LABELS[metric]}`);
                      }}
                      onMouseLeave={() => setTooltipContent("")}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none", fill: "hsl(var(--primary) / 0.8)", cursor: "pointer" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        ) : (
          <ComposableMap
            projectionConfig={{ scale: 140 }}
            width={800}
            height={400}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup>
              <Geographies geography={WORLD_GEO_URL}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const isoNum = geo.id;
                    const value = countryLookup[isoNum] || 0;
                    // Find country code for label
                    const countryCode = Object.entries(COUNTRY_ISO_MAP).find(([, v]) => v === isoNum)?.[0];
                    const countryName = countryCode ? (COUNTRY_NAMES[countryCode] || countryCode) : (geo.properties?.name || "");
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={getColor(value)}
                        stroke="hsl(var(--border))"
                        strokeWidth={0.3}
                        onMouseEnter={() => {
                          if (value > 0) {
                            setTooltipContent(`${countryName}: ${formatValue(value, metric)} ${METRIC_LABELS[metric]}`);
                          } else {
                            setTooltipContent(countryName);
                          }
                        }}
                        onMouseLeave={() => setTooltipContent("")}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", fill: value > 0 ? "hsl(var(--primary) / 0.8)" : "hsl(var(--muted) / 0.3)", cursor: "pointer" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        )}
      </div>
      {/* Legend */}
      <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
        <span>Menor</span>
        <div className="flex h-2 w-24 overflow-hidden rounded-full">
          <div className="flex-1" style={{ background: "hsl(var(--primary) / 0.15)" }} />
          <div className="flex-1" style={{ background: "hsl(var(--primary) / 0.4)" }} />
          <div className="flex-1" style={{ background: "hsl(var(--primary) / 0.65)" }} />
          <div className="flex-1" style={{ background: "hsl(var(--primary) / 1)" }} />
        </div>
        <span>Maior</span>
      </div>
    </div>
  );
}
