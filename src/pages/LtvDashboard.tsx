import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Users, TrendingUp, DollarSign, Repeat, ArrowUpDown } from "lucide-react";

// ─── Helpers ────────────────────────────────────────────────
function formatBRL(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return "R$ 0,00";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 3);
  return `${visible}***@${domain}`;
}

const BAR_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--accent)",
];

// ─── Types ──────────────────────────────────────────────────
interface Summary {
  total_leads: number;
  avg_ltv: number;
  total_revenue: number;
  repurchase_rate: number;
}

interface CampaignLTV {
  utm_campaign: string;
  total_customers: number;
  avg_ltv: number;
  total_revenue: number;
  avg_orders: number;
  avg_ticket: number;
}

interface CohortRow {
  cohort: string;
  months_since: number;
  customers: number;
}

interface ClientRow {
  customer_id: string;
  email: string;
  name: string | null;
  total_orders: number;
  lifetime_value: number;
  avg_ticket: number;
  utm_campaign: string | null;
}

type SortKey = "email" | "utm_campaign" | "total_orders" | "avg_ticket" | "lifetime_value";

// ─── Component ──────────────────────────────────────────────
export default function LtvDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignLTV[]>([]);
  const [cohorts, setCohorts] = useState<CohortRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("lifetime_value");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);

      const [summaryRes, campaignRes, cohortRes, clientRes] = await Promise.all([
        supabase.from("vw_meta_summary").select("*").maybeSingle(),
        supabase.from("vw_meta_campaign_ltv").select("*").order("avg_ltv", { ascending: false }),
        supabase.from("vw_meta_cohorts").select("*").order("cohort", { ascending: true }),
        supabase
          .from("vw_meta_ltv")
          .select("*")
          .order("lifetime_value", { ascending: false })
          .limit(20),
      ]);

      // Check for view-not-found errors (migration not applied)
      const firstError = summaryRes.error || campaignRes.error || cohortRes.error || clientRes.error;
      if (firstError) {
        console.error("[LTV Dashboard] Supabase error:", firstError);
        if (firstError.code === "PGRST204" || firstError.message?.includes("does not exist")) {
          setError("As views do LTV ainda nao foram criadas no Supabase. Execute a migration primeiro.");
        } else if (firstError.code === "42501" || firstError.message?.includes("permission denied")) {
          setError("Permissao negada ao acessar as views de LTV. Verifique os GRANTs no Supabase.");
        } else {
          setError(`Erro ao carregar dados: ${firstError.message}`);
        }
      }

      if (summaryRes.data) {
        setSummary({
          total_leads: summaryRes.data.total_leads ?? 0,
          avg_ltv: summaryRes.data.avg_ltv ?? 0,
          total_revenue: summaryRes.data.total_revenue ?? 0,
          repurchase_rate: summaryRes.data.repurchase_rate ?? 0,
        } as Summary);
      }
      if (campaignRes.data) setCampaigns(campaignRes.data as unknown as CampaignLTV[]);
      if (cohortRes.data) setCohorts(cohortRes.data as unknown as CohortRow[]);
      if (clientRes.data) setClients(clientRes.data as unknown as ClientRow[]);
      setLoading(false);
    }
    fetchAll();
  }, []);

  // ─── Cohort heatmap data ──────────────────────
  const cohortTable = useMemo(() => {
    const grouped: Record<string, Record<number, number>> = {};
    for (const row of cohorts) {
      if (!grouped[row.cohort]) grouped[row.cohort] = {};
      grouped[row.cohort][row.months_since] = row.customers;
    }

    const cohortNames = Object.keys(grouped).sort();
    const maxMonth = Math.min(
      6,
      cohorts.reduce((max, r) => Math.max(max, r.months_since), 0)
    );

    return cohortNames.map((cohort) => {
      const base = grouped[cohort][0] || 1;
      const months: (number | null)[] = [];
      for (let m = 0; m <= maxMonth; m++) {
        const val = grouped[cohort][m];
        months.push(val !== undefined ? Math.round((val / base) * 100) : null);
      }
      return { cohort, months, base };
    });
  }, [cohorts]);

  const maxMonth = cohortTable.length > 0 ? cohortTable[0].months.length - 1 : 6;

  // ─── Sorted clients ──────────────────────────
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const aVal = a[sortKey] ?? "";
      const bVal = b[sortKey] ?? "";
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortAsc ? aVal - bVal : bVal - aVal;
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [clients, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  // ─── Heatmap color ───────────────────────────
  function heatmapBg(percent: number | null): string {
    if (percent === null) return "transparent";
    if (percent >= 80) return "rgba(74, 222, 128, 0.35)";
    if (percent >= 60) return "rgba(74, 222, 128, 0.25)";
    if (percent >= 40) return "rgba(74, 222, 128, 0.18)";
    if (percent >= 20) return "rgba(74, 222, 128, 0.10)";
    if (percent > 0) return "rgba(74, 222, 128, 0.05)";
    return "transparent";
  }

  // ─── Render ───────────────────────────────────
  return (
    <div className="pt-20 lg:pt-8 lg:ml-64 min-h-screen bg-background">
      <div className="p-4 sm:p-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            LTV — Leads Meta Ads
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lifetime Value dos leads adquiridos via Facebook / Instagram Ads
          </p>
        </div>

        {/* ─── Error Banner ─────────────────────── */}
        {error && (
          <div className="rounded-lg border border-chart-negative/30 bg-chart-negative/10 p-4 text-sm text-chart-negative">
            {error}
          </div>
        )}

        {/* ─── Metric Cards ──────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="h-4 w-4" />}
            label="Total de Leads"
            value={summary ? String(summary.total_leads) : null}
            loading={loading}
          />
          <MetricCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="LTV Medio"
            value={summary ? formatBRL(summary.avg_ltv) : null}
            loading={loading}
          />
          <MetricCard
            icon={<DollarSign className="h-4 w-4" />}
            label="Receita Total"
            value={summary ? formatBRL(summary.total_revenue) : null}
            loading={loading}
          />
          <MetricCard
            icon={<Repeat className="h-4 w-4" />}
            label="Taxa de Recompra"
            value={summary ? `${summary.repurchase_rate}%` : null}
            loading={loading}
          />
        </div>

        {/* ─── LTV por Campanha ──────────────────── */}
        <div className="card-executive p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            LTV Medio por Campanha
          </h2>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : campaigns.length === 0 ? (
            <EmptyState message="Nenhuma campanha com dados de LTV encontrada." />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, campaigns.length * 48)}>
              <BarChart data={campaigns} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatBRL(v)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  type="category"
                  dataKey="utm_campaign"
                  width={180}
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                />
                <Tooltip
                  formatter={(value: number) => [formatBRL(value), "LTV Medio"]}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Bar dataKey="avg_ltv" radius={[0, 4, 4, 0]} barSize={28}>
                  {campaigns.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ─── Cohort Table ──────────────────────── */}
        <div className="card-executive p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Cohort de Recompra
          </h2>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : cohortTable.length === 0 ? (
            <EmptyState message="Nenhum dado de cohort disponivel." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Cohort</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-medium">Clientes</th>
                    {Array.from({ length: maxMonth + 1 }, (_, i) => (
                      <th key={i} className="text-center py-2 px-3 text-muted-foreground font-medium">
                        Mes {i}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cohortTable.map((row) => (
                    <tr key={row.cohort} className="border-b border-border/50">
                      <td className="py-2 px-3 font-mono text-xs text-foreground">{row.cohort}</td>
                      <td className="py-2 px-3 text-center text-foreground">{row.base}</td>
                      {row.months.map((pct, i) => (
                        <td
                          key={i}
                          className="py-2 px-3 text-center text-xs font-mono"
                          style={{ backgroundColor: heatmapBg(pct) }}
                        >
                          {pct !== null ? `${pct}%` : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Top Clientes ──────────────────────── */}
        <div className="card-executive p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Top Clientes por LTV
          </h2>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : sortedClients.length === 0 ? (
            <EmptyState message="Nenhum cliente com dados de LTV encontrado." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <SortableHeader label="Email" sortKey="email" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                    <SortableHeader label="Campanha" sortKey="utm_campaign" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                    <SortableHeader label="Pedidos" sortKey="total_orders" current={sortKey} asc={sortAsc} onSort={toggleSort} align="right" />
                    <SortableHeader label="Ticket Medio" sortKey="avg_ticket" current={sortKey} asc={sortAsc} onSort={toggleSort} align="right" />
                    <SortableHeader label="LTV" sortKey="lifetime_value" current={sortKey} asc={sortAsc} onSort={toggleSort} align="right" />
                  </tr>
                </thead>
                <tbody>
                  {sortedClients.map((client) => (
                    <tr key={client.customer_id} className="border-b border-border/50 hover:bg-muted/5 transition-colors">
                      <td className="py-2.5 px-3 text-foreground">{maskEmail(client.email)}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{client.utm_campaign || "—"}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground">{client.total_orders}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-foreground">{formatBRL(client.avg_ticket)}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-chart-positive">
                        {formatBRL(client.lifetime_value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  loading: boolean;
}) {
  return (
    <div className="card-executive p-6 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-muted-foreground">{icon}</span>
        <p className="kpi-label truncate">{label}</p>
      </div>
      {loading || value === null ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <p className="kpi-value text-[28px]">{value}</p>
      )}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
      {message}
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  current,
  asc,
  onSort,
  align = "left",
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onSort: (key: SortKey) => void;
  align?: "left" | "right";
}) {
  const isActive = current === sortKey;
  return (
    <th
      className={`py-2 px-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={`h-3 w-3 ${isActive ? "text-accent" : "opacity-40"}`} />
      </span>
    </th>
  );
}
