import { useMemo, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { geoCentroid } from "d3-geo";

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
  onDrillDown?: (newLevel: "region" | "city") => void;
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

function getDotRadius(value: number, maxValue: number): number {
  if (value === 0) return 0;
  const ratio = value / maxValue;
  return 4 + ratio * 14; // 4px min, 18px max
}

function getDotOpacity(value: number, maxValue: number): number {
  if (value === 0) return 0;
  return 0.5 + (value / maxValue) * 0.5; // 0.5 to 1.0
}

export default function GeoMapChart({ data, dataRegion, metric, level, onDrillDown }: GeoMapChartProps) {
  const [tooltipContent, setTooltipContent] = useState("");

  const isRegionLevel = level === "region";
  const activeData = isRegionLevel ? dataRegion : data;

  const isBrazilFocused = useMemo(() => {
    if (!data) return false;
    const brValue = data["BR"]?.[metric] || 0;
    const total = Object.values(data).reduce((sum, d) => sum + (d[metric] || 0), 0);
    return total > 0 && brValue / total > 0.5;
  }, [data, metric]);

  const countryLookup = useMemo(() => {
    if (!data || isRegionLevel) return {};
    const lookup: Record<string, number> = {};
    Object.entries(data).forEach(([code, values]) => {
      const isoNum = COUNTRY_ISO_MAP[code];
      if (isoNum) lookup[isoNum] = values[metric] || 0;
    });
    return lookup;
  }, [data, metric, isRegionLevel]);

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

  const GEO_FILL = "#f8f9fa";
  const GEO_STROKE = "#e2e8f0";
  const DOT_COLOR = "#3b82f6";

  return (
    <div className="relative">
      {/* SVG filter for glow effect */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id="dot-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      {tooltipContent && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-lg">
          {tooltipContent}
        </div>
      )}
      <div className="h-[300px] w-full">
        {isRegionLevel && isBrazilFocused ? (
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 600, center: [-54, -15] }}
            width={800}
            height={500}
            style={{ width: "100%", height: "100%" }}
          >
            <Geographies geography={BRAZIL_GEO_URL}>
              {({ geographies }) => (
                <>
                  {geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={GEO_FILL}
                      stroke={GEO_STROKE}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))}
                  {geographies.map((geo) => {
                    const stateName = (geo.properties.name || "").toLowerCase();
                    const value = regionLookup[stateName] || 0;
                    if (value === 0) return null;
                    const centroid = geoCentroid(geo);
                    const radius = getDotRadius(value, maxValue);
                    const opacity = getDotOpacity(value, maxValue);
                    const name = geo.properties.name || "Desconhecido";
                    return (
                      <Marker key={`dot-${geo.rsmKey}`} coordinates={centroid}>
                        <circle
                          r={radius}
                          fill={DOT_COLOR}
                          fillOpacity={opacity}
                          filter={radius > 10 ? "url(#dot-glow)" : undefined}
                          stroke={DOT_COLOR}
                          strokeWidth={1}
                          strokeOpacity={0.3}
                          style={{ cursor: "pointer", transition: "all 0.3s ease" }}
                          onMouseEnter={() =>
                            setTooltipContent(`${name}: ${formatValue(value, metric)} ${METRIC_LABELS[metric]}`)
                          }
                          onMouseLeave={() => setTooltipContent("")}
                        />
                      </Marker>
                    );
                  })}
                </>
              )}
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
                {({ geographies }) => (
                  <>
                    {geographies.map((geo) => {
                      const isoNum = geo.id;
                      const value = countryLookup[isoNum] || 0;
                      const countryCode = Object.entries(COUNTRY_ISO_MAP).find(([, v]) => v === isoNum)?.[0];
                      const canDrill = value > 0 && countryCode === "BR" && dataRegion && Object.keys(dataRegion).length > 0;
                      return (
                        <Geography
                          key={geo.rsmKey}
                          geography={geo}
                          fill={GEO_FILL}
                          stroke={GEO_STROKE}
                          strokeWidth={0.3}
                          onClick={() => {
                            if (canDrill && onDrillDown) onDrillDown("region");
                          }}
                          style={{
                            default: { outline: "none" },
                            hover: { outline: "none", cursor: canDrill ? "pointer" : "default" },
                            pressed: { outline: "none" },
                          }}
                        />
                      );
                    })}
                    {geographies.map((geo) => {
                      const isoNum = geo.id;
                      const value = countryLookup[isoNum] || 0;
                      if (value === 0) return null;
                      const centroid = geoCentroid(geo);
                      const countryCode = Object.entries(COUNTRY_ISO_MAP).find(([, v]) => v === isoNum)?.[0];
                      const countryName = countryCode ? (COUNTRY_NAMES[countryCode] || countryCode) : (geo.properties?.name || "");
                      const canDrill = countryCode === "BR" && dataRegion && Object.keys(dataRegion).length > 0;
                      const radius = getDotRadius(value, maxValue);
                      const opacity = getDotOpacity(value, maxValue);
                      return (
                        <Marker key={`dot-${geo.rsmKey}`} coordinates={centroid}>
                          <circle
                            r={radius}
                            fill={DOT_COLOR}
                            fillOpacity={opacity}
                            filter={radius > 10 ? "url(#dot-glow)" : undefined}
                            stroke={DOT_COLOR}
                            strokeWidth={1}
                            strokeOpacity={0.3}
                            style={{ cursor: canDrill ? "pointer" : "default", transition: "all 0.3s ease" }}
                            onClick={() => {
                              if (canDrill && onDrillDown) onDrillDown("region");
                            }}
                            onMouseEnter={() =>
                              setTooltipContent(`${countryName}: ${formatValue(value, metric)} ${METRIC_LABELS[metric]}${canDrill ? " • Clique para ver estados" : ""}`)
                            }
                            onMouseLeave={() => setTooltipContent("")}
                          />
                        </Marker>
                      );
                    })}
                  </>
                )}
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>
        )}
      </div>
      {/* Legend - dot size */}
      <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
        <span>Menor</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: DOT_COLOR, opacity: 0.5 }} />
          <span className="inline-block rounded-full" style={{ width: 10, height: 10, background: DOT_COLOR, opacity: 0.65 }} />
          <span className="inline-block rounded-full" style={{ width: 14, height: 14, background: DOT_COLOR, opacity: 0.8 }} />
          <span className="inline-block rounded-full" style={{ width: 18, height: 18, background: DOT_COLOR, opacity: 1 }} />
        </div>
        <span>Maior</span>
      </div>
    </div>
  );
}
