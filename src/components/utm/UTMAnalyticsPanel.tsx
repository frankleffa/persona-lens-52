import { useMemo, useState } from "react";
import type { GA4UTMEntry, GA4EventBreakdown, GA4UTMEventEntry } from "@/hooks/useAdsData";
import {
  normalizeUTMData,
  aggregateByChannel,
  detectQualityAlerts,
  getConversionRateTier,
  type NormalizedUTMEntry,
  type ChannelSummary,
  type UTMQualityAlert,
} from "@/lib/utm-utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowUpDown, BarChart3, Filter, Search, X, Layers, Target, Microscope, Grid3X3, Crosshair } from "lucide-react";

// ─── Summary Cards ──────────────────────────────────────────────────────

function SummaryCards({ data }: { data: NormalizedUTMEntry[] }) {
  const totals = useMemo(() => {
    const t = { sessions: 0, users: 0, conversions: 0 };
    for (const row of data) {
      t.sessions += row.sessions;
      t.users += row.users;
      t.conversions += row.conversions;
    }
    return { ...t, rate: t.sessions > 0 ? Math.round((t.conversions / t.sessions) * 10000) / 100 : 0 };
  }, [data]);

  const cards = [
    { label: "Sessões", value: totals.sessions.toLocaleString("pt-BR") },
    { label: "Usuários", value: totals.users.toLocaleString("pt-BR") },
    { label: "Conversões", value: totals.conversions.toLocaleString("pt-BR") },
    { label: "Taxa de Conversão", value: `${totals.rate.toFixed(2)}%` },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border/50 bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{c.label}</p>
          <p className="mt-1 text-xl font-bold text-foreground">{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Quality Alerts ─────────────────────────────────────────────────────

function QualityAlerts({ alerts }: { alerts: UTMQualityAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="rounded-xl border border-chart-amber/30 bg-chart-amber/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-chart-amber">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm font-semibold">Alertas de qualidade dos dados</span>
      </div>
      <ul className="space-y-1">
        {alerts.map((a, i) => (
          <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-chart-amber shrink-0" />
            {a.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Conversion Rate Badge ──────────────────────────────────────────────

function RateBadge({ rate }: { rate: number }) {
  const tier = getConversionRateTier(rate);
  const cls =
    tier === "high"
      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      : tier === "medium"
      ? "bg-chart-amber/10 text-chart-amber border-chart-amber/20"
      : "bg-muted text-muted-foreground border-border/50";
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{rate.toFixed(2)}%</span>;
}

// ─── Source / Medium Badges ─────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const colorMap: Record<string, string> = {
    google: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    facebook: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    instagram: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    meta: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    bing: "bg-teal-500/10 text-teal-500 border-teal-500/20",
  };
  const cls = colorMap[source] || "bg-muted text-muted-foreground border-border/50";
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>{source}</span>;
}

function MediumBadge({ medium }: { medium: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border/50 bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {medium}
    </span>
  );
}

// ─── Filters Bar ────────────────────────────────────────────────────────

interface FiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  sourceFilter: string;
  setSourceFilter: (v: string) => void;
  mediumFilter: string;
  setMediumFilter: (v: string) => void;
  sources: string[];
  mediums: string[];
  onClear: () => void;
  hasFilters: boolean;
}

function FiltersBar({ searchTerm, setSearchTerm, sourceFilter, setSourceFilter, mediumFilter, setMediumFilter, sources, mediums, onClear, hasFilters }: FiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar campanha..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>
      <Select value={sourceFilter} onValueChange={setSourceFilter}>
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos sources</SelectItem>
          {sources.map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={mediumFilter} onValueChange={setMediumFilter}>
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="Medium" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos mediums</SelectItem>
          {mediums.map((m) => (
            <SelectItem key={m} value={m}>{m}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onClear} className="h-9 gap-1 text-xs">
          <X className="h-3 w-3" /> Limpar
        </Button>
      )}
    </div>
  );
}

// ─── Sortable Header ────────────────────────────────────────────────────

type SortKey = "sessions" | "users" | "conversions" | "conversionRate" | "source" | "medium" | "campaign";

function SortableHeader({ label, sortKey, current, direction, onSort, align }: { label: string; sortKey: SortKey; current: SortKey; direction: "asc" | "desc"; onSort: (k: SortKey) => void; align?: "right" }) {
  const active = current === sortKey;
  return (
    <TableHead
      className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${align === "right" ? "text-right" : ""}`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${active ? "text-foreground" : "opacity-40"}`} />
        {active && <span className="text-[10px]">{direction === "asc" ? "↑" : "↓"}</span>}
      </span>
    </TableHead>
  );
}

// ─── Sort helper ────────────────────────────────────────────────────────

function sortData<T extends Record<string, any>>(data: T[], key: string, dir: "asc" | "desc"): T[] {
  return [...data].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (typeof va === "number" && typeof vb === "number") return dir === "asc" ? va - vb : vb - va;
    return dir === "asc" ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
  });
}

// ─── Main Component ─────────────────────────────────────────────────────

export interface MetaTotals {
  purchases: number;
  registrations: number;
  ftd: number;
}

interface UTMAnalyticsPanelProps {
  data: GA4UTMEntry[];
  eventBreakdown?: GA4EventBreakdown[];
  utmEventsByCampaign?: GA4UTMEventEntry[];
  firstTouchEvents?: GA4UTMEventEntry[];
  metaTotals?: MetaTotals;
}

const META_SOURCES_FILTER = new Set(["fb", "ig", "instagram", "meta", "facebook", "an"]);

const EVENT_NAME_MAP: Record<string, string> = {
  purchase: "Depósito Confirmado",
  generate_lead: "Lead",
  sign_up: "Cadastro",
  signup_confirmed: "Cadastro Confirmado",
  begin_checkout: "Início de Checkout",
  initiate_checkout: "Início de Depósito",
  add_to_cart: "Carrinho",
  contact: "Contato",
  submit_form: "Formulário",
  first_deposit: "FTD (Primeiro Depósito)",
  ftd: "FTD",
  deposit_confirmed: "Depósito Confirmado",
  page_view: "Visualização",
  scroll: "Scroll",
  click: "Clique",
  file_download: "Download",
  video_start: "Vídeo Iniciado",
  first_open: "Primeira Abertura",
  session_start: "Início de Sessão",
};

function translateEventName(name: string): string {
  return EVENT_NAME_MAP[name] || name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function EventBreakdownCards({ events }: { events: GA4EventBreakdown[] }) {
  if (!events || events.length === 0) return null;
  const sorted = [...events].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, e) => s + e.count, 0);

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Detalhamento de Conversões GA4</h4>
        <span className="text-xs text-muted-foreground ml-auto">Total: {total.toLocaleString("pt-BR")}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Total real de disparos dos eventos de conversão rastreados pelo GA4 (via GTM). Inclui todos os eventos relevantes, independente de estarem marcados como "chave".
      </p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {sorted.map((ev) => {
          const pct = total > 0 ? ((ev.count / total) * 100).toFixed(1) : "0";
          return (
            <div key={ev.eventName} className="rounded-lg border border-border/40 bg-muted/30 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground truncate" title={ev.eventName}>
                {translateEventName(ev.eventName)}
              </p>
              <p className="text-lg font-bold text-foreground">{ev.count.toLocaleString("pt-BR")}</p>
              <p className="text-[10px] text-muted-foreground">{pct}% do total</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Meta vs GA4 Comparison ─────────────────────────────────────────────

function DiffBadge({ metaVal, ga4Val }: { metaVal: number; ga4Val: number }) {
  if (metaVal === 0 && ga4Val === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
  const base = Math.max(metaVal, 1);
  const diff = Math.round(((ga4Val - metaVal) / base) * 100);
  const absDiff = Math.abs(diff);
  
  let cls = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"; // aligned
  if (absDiff > 10 && ga4Val < metaVal) cls = "bg-chart-amber/10 text-chart-amber border-chart-amber/20"; // Meta higher
  if (absDiff > 10 && ga4Val > metaVal) cls = "bg-blue-500/10 text-blue-500 border-blue-500/20"; // GA4 higher
  
  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${cls}`}>
      {diff > 0 ? "+" : ""}{diff}%
    </span>
  );
}

function MetaVsGA4Comparison({ metaTotals, ga4Totals }: { metaTotals: MetaTotals; ga4Totals: Record<string, number> }) {
  const rows = [
    { label: "Compras", metaKey: "purchases" as const, ga4Events: ["purchase"] },
    { label: "Cadastros", metaKey: "registrations" as const, ga4Events: ["sign_up", "signup_confirmed"] },
    { label: "FTD", metaKey: "ftd" as const, ga4Events: ["first_deposit", "ftd"] },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* Meta Card */}
      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500" />
          <h4 className="text-sm font-semibold text-foreground">Meta Ads (Atribuição)</h4>
        </div>
        <p className="text-[10px] text-muted-foreground">Janela 7d clique / 1d view — atribuído às campanhas Meta</p>
        <div className="space-y-2">
          {rows.map(r => (
            <div key={r.metaKey} className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{r.label}</span>
              <span className="text-sm font-bold text-foreground">{metaTotals[r.metaKey].toLocaleString("pt-BR")}</span>
            </div>
          ))}
        </div>
      </div>
      {/* GA4 Card */}
      <div className="rounded-xl border border-chart-amber/20 bg-chart-amber/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-chart-amber" />
          <h4 className="text-sm font-semibold text-foreground">GA4 (Tráfego Meta)</h4>
        </div>
        <p className="text-[10px] text-muted-foreground">Last-click — apenas sessões com source fb/ig/meta/an</p>
        <div className="space-y-2">
          {rows.map(r => {
            const ga4Val = r.ga4Events.reduce((s, ev) => s + (ga4Totals[ev] || 0), 0);
            return (
              <div key={r.metaKey} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{r.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{ga4Val.toLocaleString("pt-BR")}</span>
                  <DiffBadge metaVal={metaTotals[r.metaKey]} ga4Val={ga4Val} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function UTMAnalyticsPanel({ data, eventBreakdown, utmEventsByCampaign, firstTouchEvents, metaTotals }: UTMAnalyticsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [mediumFilter, setMediumFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("conversions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [channelSortKey, setChannelSortKey] = useState<SortKey>("conversions");
  const [channelSortDir, setChannelSortDir] = useState<"asc" | "desc">("desc");

  const alerts = useMemo(() => detectQualityAlerts(data), [data]);
  const normalized = useMemo(() => normalizeUTMData(data), [data]);

  const sources = useMemo(() => [...new Set(normalized.map((r) => r.source))].sort(), [normalized]);
  const mediums = useMemo(() => [...new Set(normalized.map((r) => r.medium))].sort(), [normalized]);

  const filtered = useMemo(() => {
    let rows = normalized;
    if (sourceFilter !== "all") rows = rows.filter((r) => r.source === sourceFilter);
    if (mediumFilter !== "all") rows = rows.filter((r) => r.medium === mediumFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      rows = rows.filter((r) => r.campaign.toLowerCase().includes(q) || r.source.toLowerCase().includes(q) || r.medium.toLowerCase().includes(q));
    }
    return rows;
  }, [normalized, sourceFilter, mediumFilter, searchTerm]);

  const sortedCampaigns = useMemo(() => sortData(filtered, sortKey, sortDir), [filtered, sortKey, sortDir]);

  const channels = useMemo(() => aggregateByChannel(filtered), [filtered]);
  const sortedChannels = useMemo(() => sortData(channels, channelSortKey, channelSortDir), [channels, channelSortKey, channelSortDir]);

  const hasFilters = sourceFilter !== "all" || mediumFilter !== "all" || searchTerm !== "";
  const clearFilters = () => {
    setSearchTerm("");
    setSourceFilter("all");
    setMediumFilter("all");
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const handleChannelSort = (key: SortKey) => {
    if (channelSortKey === key) setChannelSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setChannelSortKey(key); setChannelSortDir("desc"); }
  };

  // Build events-by-campaign cross table data
  const eventsByCampaignData = useMemo(() => {
    if (!utmEventsByCampaign || utmEventsByCampaign.length === 0) return { campaigns: [], eventNames: [], ga4Totals: {} as Record<string, number> };
    
    // Filter to Meta sources only
    const metaFiltered = utmEventsByCampaign.filter(entry => META_SOURCES_FILTER.has(entry.source.toLowerCase().trim()));
    if (metaFiltered.length === 0) return { campaigns: [], eventNames: [], ga4Totals: {} as Record<string, number> };
    
    // Aggregate by campaign
    const campaignMap = new Map<string, { campaign: string; source: string; medium: string; events: Record<string, number>; total: number }>();
    for (const entry of metaFiltered) {
      const key = `${entry.campaign}__${entry.source}__${entry.medium}`;
      if (!campaignMap.has(key)) {
        campaignMap.set(key, { campaign: entry.campaign, source: entry.source, medium: entry.medium, events: {}, total: 0 });
      }
      const row = campaignMap.get(key)!;
      row.events[entry.eventName] = (row.events[entry.eventName] || 0) + entry.count;
      row.total += entry.count;
    }
    
    // Get unique event names sorted by total count
    const eventTotals = new Map<string, number>();
    for (const row of campaignMap.values()) {
      for (const [ev, count] of Object.entries(row.events)) {
        eventTotals.set(ev, (eventTotals.get(ev) || 0) + count);
      }
    }
    const eventNames = [...eventTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    const campaigns = [...campaignMap.values()].sort((a, b) => b.total - a.total);
    const ga4Totals = Object.fromEntries(eventTotals.entries());
    
    return { campaigns, eventNames, ga4Totals };
  }, [utmEventsByCampaign]);

  // Build first-touch events data (filtered to Meta sources)
  const firstTouchData = useMemo(() => {
    if (!firstTouchEvents || firstTouchEvents.length === 0) return { campaigns: [], eventNames: [], ga4Totals: {} as Record<string, number> };
    
    const metaFiltered = firstTouchEvents.filter(entry => META_SOURCES_FILTER.has(entry.source.toLowerCase().trim()));
    if (metaFiltered.length === 0) return { campaigns: [], eventNames: [], ga4Totals: {} as Record<string, number> };
    
    const campaignMap = new Map<string, { campaign: string; source: string; medium: string; events: Record<string, number>; total: number }>();
    for (const entry of metaFiltered) {
      const key = `${entry.campaign}__${entry.source}__${entry.medium}`;
      if (!campaignMap.has(key)) {
        campaignMap.set(key, { campaign: entry.campaign, source: entry.source, medium: entry.medium, events: {}, total: 0 });
      }
      const row = campaignMap.get(key)!;
      row.events[entry.eventName] = (row.events[entry.eventName] || 0) + entry.count;
      row.total += entry.count;
    }
    
    const eventTotals = new Map<string, number>();
    for (const row of campaignMap.values()) {
      for (const [ev, count] of Object.entries(row.events)) {
        eventTotals.set(ev, (eventTotals.get(ev) || 0) + count);
      }
    }
    const eventNames = [...eventTotals.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
    const campaigns = [...campaignMap.values()].sort((a, b) => b.total - a.total);
    const ga4Totals = Object.fromEntries(eventTotals.entries());
    
    return { campaigns, eventNames, ga4Totals };
  }, [firstTouchEvents]);

  if (!data || data.length === 0) return null;

  return (
    <div className="animate-slide-up space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-chart-amber bg-chart-amber/15">
          <BarChart3 className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">UTMs — Análise de Tráfego Pago</h3>
          <p className="text-xs text-muted-foreground">Dados do Google Analytics 4 • Apenas tráfego pago</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-10">
          <TabsTrigger value="overview" className="gap-1.5 text-xs">
            <BarChart3 className="h-3.5 w-3.5" /> Visão Geral
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5 text-xs">
            <Target className="h-3.5 w-3.5" /> Por Campanha
          </TabsTrigger>
          <TabsTrigger value="events_utm" className="gap-1.5 text-xs">
            <Grid3X3 className="h-3.5 w-3.5" /> Eventos por UTM
          </TabsTrigger>
          <TabsTrigger value="channels" className="gap-1.5 text-xs">
            <Layers className="h-3.5 w-3.5" /> Canais
          </TabsTrigger>
          <TabsTrigger value="advanced" className="gap-1.5 text-xs">
            <Microscope className="h-3.5 w-3.5" /> Diagnóstico
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Visão Geral ─── */}
        <TabsContent value="overview" className="space-y-4">
          <QualityAlerts alerts={alerts} />
          <SummaryCards data={filtered} />
          {eventBreakdown && eventBreakdown.length > 0 && (
            <EventBreakdownCards events={eventBreakdown} />
          )}
        </TabsContent>

        {/* ─── Tab: Eventos por UTM ─── */}
        <TabsContent value="events_utm" className="space-y-4">
          {/* Meta vs GA4 Comparison */}
          {metaTotals && eventsByCampaignData.campaigns.length > 0 && (
            <MetaVsGA4Comparison metaTotals={metaTotals} ga4Totals={eventsByCampaignData.ga4Totals} />
          )}

          {eventsByCampaignData.campaigns.length === 0 ? (
            <div className="card-executive p-6 text-center text-sm text-muted-foreground">
              Nenhum dado de eventos do Meta (fb/ig/meta/an) disponível. Verifique se as UTMs estão configuradas nas campanhas.
            </div>
          ) : (
            <div className="card-executive overflow-hidden">
              <div className="p-4 border-b border-border/50">
                <h4 className="text-sm font-semibold text-foreground">Eventos de Conversão por Campanha (Tráfego Meta)</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Filtrado por sources Meta (fb, ig, meta, an) • eventCount GA4</p>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow className="border-b border-border/50">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground min-w-[200px]">Campanha</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</TableHead>
                      {eventsByCampaignData.eventNames.map((ev) => (
                        <TableHead key={ev} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right min-w-[80px]">
                          {translateEventName(ev)}
                        </TableHead>
                      ))}
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-foreground text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventsByCampaignData.campaigns.map((row, i) => (
                      <TableRow key={`${row.campaign}-${row.source}-${i}`} className="border-b border-border/30">
                        <TableCell className="text-muted-foreground max-w-[220px] truncate" title={row.campaign}>{row.campaign}</TableCell>
                        <TableCell><SourceBadge source={row.source} /></TableCell>
                        {eventsByCampaignData.eventNames.map((ev) => (
                          <TableCell key={ev} className="text-right tabular-nums text-muted-foreground">
                            {row.events[ev] ? row.events[ev].toLocaleString("pt-BR") : <span className="text-muted-foreground/30">—</span>}
                          </TableCell>
                        ))}
                        <TableCell className="text-right font-bold text-foreground">{row.total.toLocaleString("pt-BR")}</TableCell>
                      </TableRow>
                    ))}
                    {/* Totals row */}
                    <TableRow className="border-t-2 border-border bg-muted/30">
                      <TableCell className="font-semibold text-foreground" colSpan={2}>Total</TableCell>
                      {eventsByCampaignData.eventNames.map((ev) => {
                        const total = eventsByCampaignData.campaigns.reduce((s, r) => s + (r.events[ev] || 0), 0);
                        return (
                          <TableCell key={ev} className="text-right font-bold tabular-nums text-foreground">
                            {total.toLocaleString("pt-BR")}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-bold text-foreground">
                        {eventsByCampaignData.campaigns.reduce((s, r) => s + r.total, 0).toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Tab: Por Campanha ─── */}
        <TabsContent value="campaigns">
          <FiltersBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            sourceFilter={sourceFilter}
            setSourceFilter={setSourceFilter}
            mediumFilter={mediumFilter}
            setMediumFilter={setMediumFilter}
            sources={sources}
            mediums={mediums}
            onClear={clearFilters}
            hasFilters={hasFilters}
          />
          <div className="card-executive overflow-hidden mt-3">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="border-b border-border/50">
                    <SortableHeader label="Source" sortKey="source" current={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableHeader label="Medium" sortKey="medium" current={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableHeader label="Campanha" sortKey="campaign" current={sortKey} direction={sortDir} onSort={handleSort} />
                    <SortableHeader label="Sessões" sortKey="sessions" current={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                    <SortableHeader label="Usuários" sortKey="users" current={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                    <SortableHeader label="Conversões" sortKey="conversions" current={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                    <SortableHeader label="Taxa Conv." sortKey="conversionRate" current={sortKey} direction={sortDir} onSort={handleSort} align="right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedCampaigns.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">Nenhum dado encontrado</TableCell></TableRow>
                  ) : sortedCampaigns.map((row, i) => (
                    <TableRow key={`${row.source}-${row.medium}-${row.campaign}-${i}`} className="border-b border-border/30">
                      <TableCell><SourceBadge source={row.source} /></TableCell>
                      <TableCell><MediumBadge medium={row.medium} /></TableCell>
                      <TableCell className="text-muted-foreground max-w-[220px] truncate" title={row.campaign}>{row.campaign}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{row.sessions.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.users.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{row.conversions.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right"><RateBadge rate={row.conversionRate} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab: Canais ─── */}
        <TabsContent value="channels">
          <div className="card-executive overflow-hidden">
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow className="border-b border-border/50">
                    <SortableHeader label="Source" sortKey="source" current={channelSortKey} direction={channelSortDir} onSort={handleChannelSort} />
                    <SortableHeader label="Sessões" sortKey="sessions" current={channelSortKey} direction={channelSortDir} onSort={handleChannelSort} align="right" />
                    <SortableHeader label="Usuários" sortKey="users" current={channelSortKey} direction={channelSortDir} onSort={handleChannelSort} align="right" />
                    <SortableHeader label="Conversões" sortKey="conversions" current={channelSortKey} direction={channelSortDir} onSort={handleChannelSort} align="right" />
                    <SortableHeader label="Taxa de Conversão" sortKey="conversionRate" current={channelSortKey} direction={channelSortDir} onSort={handleChannelSort} align="right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedChannels.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhum dado encontrado</TableCell></TableRow>
                  ) : sortedChannels.map((row) => (
                    <TableRow key={row.source} className="border-b border-border/30">
                      <TableCell><SourceBadge source={row.source} /></TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{row.sessions.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{row.users.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right font-semibold text-foreground">{row.conversions.toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-right"><RateBadge rate={row.conversionRate} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab 3: Advanced Diagnostics ─── */}
        <TabsContent value="advanced">
          <div className="card-executive p-6 space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Diagnóstico Avançado</h4>
              <p className="text-xs text-muted-foreground">
                Futuramente esta aba incluirá análise por <strong>utm_content</strong> (criativo), <strong>utm_term</strong> (público/adset), <strong>landing page</strong> e <strong>dispositivo</strong>.
              </p>
            </div>

            {/* Show high-traffic low-conversion campaigns */}
            {(() => {
              const inefficient = sortedCampaigns.filter((r) => r.sessions >= 10 && r.conversionRate < 1);
              if (inefficient.length === 0) return (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                  Nenhuma campanha com alto tráfego e baixa eficiência detectada.
                </div>
              );
              return (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-chart-amber flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {inefficient.length} campanha(s) com alto tráfego e baixa conversão (&lt;1%)
                  </p>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow className="border-b border-border/50">
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Campanha</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Sessões</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Conv.</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Taxa</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inefficient.slice(0, 10).map((row, i) => (
                          <TableRow key={i} className="border-b border-border/30">
                            <TableCell className="text-muted-foreground max-w-[250px] truncate" title={row.campaign}>{row.campaign}</TableCell>
                            <TableCell className="text-right font-semibold text-foreground">{row.sessions.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{row.conversions.toLocaleString("pt-BR")}</TableCell>
                            <TableCell className="text-right"><RateBadge rate={row.conversionRate} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })()}

            {/* Prepared slots for future metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {["utm_content (Criativo)", "utm_term (Público)", "Landing Page", "Dispositivo"].map((label) => (
                <div key={label} className="rounded-lg border border-dashed border-border/50 bg-muted/20 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground/40">Em breve</p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
