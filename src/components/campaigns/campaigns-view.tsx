"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Columns3,
  Copy,
  Filter,
  History,
  ImageIcon,
  Layers,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Calendar,
  SlidersHorizontal,
  Upload,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Drawer } from "@/components/ui/drawer";
import { EmptyState } from "@/components/ui/empty-state";
import { CampaignsChart } from "./campaigns-chart";
import {
  breakdowns,
  businesses,
  columns,
  defaultColumns,
  rows as seedRows,
  statusMeta,
  type BreakdownKey,
  type BreakdownRow,
  type ColumnKey,
  type Level,
  type Row,
  type RowStatus,
} from "./meta-data";

const levels: { key: Level; label: string }[] = [
  { key: "campaign", label: "Campanhas" },
  { key: "adset", label: "Conjuntos" },
  { key: "ad", label: "Anúncios" },
];

const selectCls =
  "h-9 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40";

type Focus = { campaign?: { id: string; name: string }; adset?: { id: string; name: string } };

type Rule = { id: string; metric: string; op: string; value: string; action: string; scope: string };

const seedRules: Rule[] = [
  { id: "r1", metric: "CPA", op: ">", value: "80", action: "Pausar", scope: "Campanhas ativas" },
  { id: "r2", metric: "ROAS", op: "<", value: "2", action: "Reduzir orçamento 20%", scope: "Todas" },
];

type Filters = {
  statuses: RowStatus[];
  delivery: "all" | "on" | "off";
  roasMin: string;
  cpaMax: string;
  spendMin: string;
};
const emptyFilters: Filters = { statuses: [], delivery: "all", roasMin: "", cpaMax: "", spendMin: "" };

type LogEntry = { id: string; text: string; when: string };
const seedLog: LogEntry[] = [
  { id: "lg1", text: "Orçamento de “BF24 — Remarketing Conversão” alterado para R$ 600/dia", when: "há 2 h" },
  { id: "lg2", text: "Conjunto “Amplo — Reels 18-34” pausado", when: "ontem 18:14" },
  { id: "lg3", text: "Regra criada: CPA > R$ 80 → Pausar", when: "ontem 09:02" },
];

export function CampaignsView() {
  const [rows, setRows] = useState<Row[]>(seedRows);
  const [bmId, setBmId] = useState(businesses[0].id);
  const bm = businesses.find((b) => b.id === bmId)!;
  const [accountId, setAccountId] = useState(bm.accounts[0].id);
  const [level, setLevel] = useState<Level>("campaign");
  const [focus, setFocus] = useState<Focus>({});
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState<ColumnKey[]>(defaultColumns);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showChart, setShowChart] = useState(false);
  const [breakdown, setBreakdown] = useState<BreakdownKey>("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  // edição / criação / regras
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [createKind, setCreateKind] = useState<null | "adset" | "ad">(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState<Rule[]>(seedRules);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [log, setLog] = useState<LogEntry[]>(seedLog);

  function pushLog(text: string) {
    const when = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    setLog((l) => [{ id: `lg-${Date.now()}`, text, when }, ...l]);
  }

  const activeFilters =
    filters.statuses.length +
    (filters.delivery !== "all" ? 1 : 0) +
    (filters.roasMin ? 1 : 0) +
    (filters.cpaMax ? 1 : 0) +
    (filters.spendMin ? 1 : 0);

  const account = bm.accounts.find((a) => a.id === accountId) ?? bm.accounts[0];
  const breakdownDef = breakdowns.find((b) => b.key === breakdown)!;
  const inBreakdown = breakdown !== "none";

  function changeBm(id: string) {
    const next = businesses.find((b) => b.id === id)!;
    setBmId(id);
    setAccountId(next.accounts[0].id);
    setFocus({});
    setSelected(new Set());
  }
  function changeAccount(id: string) {
    setAccountId(id);
    setFocus({});
    setSelected(new Set());
  }
  function changeLevel(l: Level) {
    setLevel(l);
    setFocus({});
    setSelected(new Set());
  }

  function drill(r: Row) {
    if (r.level === "campaign") {
      setFocus({ campaign: { id: r.id, name: r.name } });
      setLevel("adset");
    } else if (r.level === "adset") {
      setFocus((f) => ({ campaign: f.campaign, adset: { id: r.id, name: r.name } }));
      setLevel("ad");
    }
    setSelected(new Set());
  }

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (r.account !== account.id || r.level !== level) return false;
        if (!r.name.toLowerCase().includes(query.toLowerCase())) return false;
        if (level === "adset" && focus.campaign && r.parentId !== focus.campaign.id) return false;
        if (level === "ad" && focus.adset && r.parentId !== focus.adset.id) return false;
        // filtros avançados
        if (filters.statuses.length && !filters.statuses.includes(r.status)) return false;
        if (filters.delivery === "on" && !r.delivery) return false;
        if (filters.delivery === "off" && r.delivery) return false;
        if (filters.roasMin && r.roas < Number(filters.roasMin)) return false;
        if (filters.cpaMax && r.cpa > Number(filters.cpaMax)) return false;
        if (filters.spendMin && r.spend < Number(filters.spendMin)) return false;
        return true;
      }),
    [rows, account.id, level, query, focus, filters]
  );

  const visibleCols = columns.filter((c) => visible.includes(c.key));
  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((r) => r.id)));
  }
  function toggleRow(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleDelivery(r: Row) {
    setRows((rs) =>
      rs.map((x) =>
        x.id === r.id ? { ...x, delivery: !x.delivery, status: !x.delivery ? "ativa" : "pausada" } : x
      )
    );
    pushLog(`“${r.name}” ${r.delivery ? "pausado(a)" : "ativado(a)"}`);
  }
  function bulk(action: string) {
    toast.success(`${action} aplicado a ${selected.size} item(ns).`);
    pushLog(`${action} em massa aplicado a ${selected.size} item(ns)`);
    setSelected(new Set());
  }
  function saveBudget(r: Row) {
    const v = Number(editValue);
    if (!Number.isNaN(v) && v > 0 && v !== r.budget) {
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, budget: v } : x)));
      toast.success(`Orçamento de "${r.name}" atualizado.`);
      pushLog(`Orçamento de “${r.name}” alterado para R$ ${v}/dia`);
    }
    setEditingId(null);
  }
  function duplicate(r: Row) {
    const copy: Row = { ...r, id: `${r.id}-${Date.now()}`, name: `${r.name} (cópia)`, status: "pausada", delivery: false };
    setRows((rs) => [...rs, copy]);
    toast.success(`"${r.name}" duplicado.`);
    pushLog(`“${r.name}” duplicado(a)`);
  }
  function remove(r: Row) {
    setRows((rs) => rs.filter((x) => x.id !== r.id));
    toast(`"${r.name}" excluído.`);
    pushLog(`“${r.name}” excluído(a)`);
  }
  function colTotal(key: ColumnKey) {
    const col = columns.find((c) => c.key === key)!;
    if (col.total === "none") return null;
    const vals = filtered.map((r) => r[key]);
    const sum = vals.reduce((a, b) => a + b, 0);
    const v = col.total === "avg" ? (filtered.length ? sum / filtered.length : 0) : sum;
    return col.formatTotal ? col.formatTotal(v) : String(v);
  }

  const levelNoun = level === "campaign" ? "campanhas" : level === "adset" ? "conjuntos" : "anúncios";

  return (
    <>
      {/* Contexto de conta */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Dropdown trigger={<SelectButton icon={<Building2 className="size-4 text-muted-foreground" />} label={bm.name} hint="Business" />}>
          {(close) =>
            businesses.map((b) => (
              <Item key={b.id} active={b.id === bmId} onClick={() => { changeBm(b.id); close(); }}>
                {b.name}
              </Item>
            ))
          }
        </Dropdown>
        <Dropdown trigger={<SelectButton label={account.name} hint={account.id} />}>
          {(close) =>
            bm.accounts.map((a) => (
              <Item key={a.id} active={a.id === accountId} onClick={() => { changeAccount(a.id); close(); }}>
                <span className="flex flex-col">
                  <span>{a.name}</span>
                  <span className="tnum text-xs text-soft-foreground">{a.id}</span>
                </span>
              </Item>
            ))
          }
        </Dropdown>
      </div>

      {/* Breadcrumb (drill-down) */}
      {(focus.campaign || focus.adset) && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 text-sm">
          <Crumb onClick={() => changeLevel("campaign")}>{account.name}</Crumb>
          {focus.campaign && (
            <>
              <ChevronRight className="size-3.5 text-soft-foreground" />
              <Crumb
                active={!focus.adset}
                onClick={() => { setFocus({ campaign: focus.campaign }); setLevel("adset"); }}
              >
                {focus.campaign.name}
              </Crumb>
            </>
          )}
          {focus.adset && (
            <>
              <ChevronRight className="size-3.5 text-soft-foreground" />
              <Crumb active>{focus.adset.name}</Crumb>
            </>
          )}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Gerenciador</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">Campanhas</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setLogOpen(true)}>
            <History />
            Histórico
          </Button>
          <Button variant="outline" onClick={() => setRulesOpen(true)}>
            <Zap />
            Regras
          </Button>
          <Dropdown
            align="right"
            trigger={
              <span className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-[filter] hover:brightness-110">
                <Plus className="size-4" />
                Criar
                <ChevronDown className="size-3.5" />
              </span>
            }
          >
            {(close) => (
              <>
                <Link href="/campanhas/criar" className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2" onClick={close}>
                  Campanha
                </Link>
                <button className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2" onClick={() => { setCreateKind("adset"); close(); }}>
                  Conjunto de anúncios
                </button>
                <button className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2" onClick={() => { setCreateKind("ad"); close(); }}>
                  Anúncio
                </button>
              </>
            )}
          </Dropdown>
        </div>
      </div>

      {/* Gráfico colapsável */}
      {showChart && (
        <Card className="mb-4 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Desempenho</p>
              <h2 className="mt-1 text-sm font-medium text-foreground">Valor gasto × Resultados</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-[var(--primary)]" />Valor gasto</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--chart-2)]" />Resultados</span>
            </div>
          </div>
          <CampaignsChart />
        </Card>
      )}

      {/* Níveis */}
      <div className="mb-4 flex items-center gap-1 border-b border-border">
        {levels.map((l) => (
          <button
            key={l.key}
            onClick={() => changeLevel(l.key)}
            className={cn(
              "relative px-3 py-2.5 text-sm font-medium transition-colors",
              level === l.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {l.label}
            {level === l.key && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-soft-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Buscar ${levelNoun}…`}
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <button
          onClick={() => setShowChart((s) => !s)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
            showChart ? "border-primary/40 bg-primary-soft text-primary" : "border-border bg-surface text-foreground hover:border-border-strong"
          )}
        >
          <BarChart3 className="size-4" />
          Gráficos
        </button>

        <button
          onClick={() => setFiltersOpen(true)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
            activeFilters > 0
              ? "border-primary/40 bg-primary-soft text-primary"
              : "border-border bg-surface text-foreground hover:border-border-strong"
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filtros
          {activeFilters > 0 && (
            <span className="tnum grid size-4 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilters}
            </span>
          )}
        </button>

        <Dropdown
          panelClass="w-52"
          trigger={
            <span className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong">
              <Layers className="size-4 text-muted-foreground" />
              {inBreakdown ? `Por ${breakdownDef.label.toLowerCase()}` : "Repartição"}
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </span>
          }
        >
          {(close) =>
            breakdowns.map((b) => (
              <Item key={b.key} active={b.key === breakdown} onClick={() => { setBreakdown(b.key); close(); }}>
                {b.label}
              </Item>
            ))
          }
        </Dropdown>

        <button className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong">
          <Calendar className="size-4 text-muted-foreground" />
          Últimos 30 dias
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>

        <Dropdown
          align="right"
          panelClass="w-64"
          trigger={
            <span className="flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:border-border-strong">
              <Columns3 className="size-4 text-muted-foreground" />
              Colunas
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </span>
          }
        >
          {() => (
            <div>
              <p className="eyebrow px-2.5 py-2">Personalizar colunas</p>
              <div className="max-h-72 overflow-y-auto scroll-slim">
                {columns.map((c) => {
                  const on = visible.includes(c.key);
                  return (
                    <button
                      key={c.key}
                      onClick={() => setVisible((v) => (on ? v.filter((k) => k !== c.key) : [...v, c.key]))}
                      className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2"
                    >
                      <CheckBox checked={on} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 border-t border-border px-1 pt-1">
                <button onClick={() => setVisible(defaultColumns)} className="w-full rounded px-2.5 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                  Redefinir padrão
                </button>
              </div>
            </div>
          )}
        </Dropdown>
      </div>

      {/* Barra de seleção em massa */}
      {!inBreakdown && selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 py-2">
          <span className="text-sm font-medium text-primary">{selected.size} selecionado(s)</span>
          <div className="ml-auto flex items-center gap-1.5">
            <BulkBtn onClick={() => bulk("Ativar")} icon={<Play className="size-3.5" />}>Ativar</BulkBtn>
            <BulkBtn onClick={() => bulk("Pausar")} icon={<Pause className="size-3.5" />}>Pausar</BulkBtn>
            <BulkBtn onClick={() => bulk("Duplicar")} icon={<Copy className="size-3.5" />}>Duplicar</BulkBtn>
            <BulkBtn onClick={() => bulk("Excluir")} icon={<Trash2 className="size-3.5" />}>Excluir</BulkBtn>
            <button onClick={() => setSelected(new Set())} className="ml-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground">Limpar</button>
          </div>
        </div>
      )}

      {/* Repartição */}
      {inBreakdown && <BreakdownTable label={breakdownDef.label} rows={breakdownDef.rows} cols={visibleCols} />}

      {/* Tabela */}
      {!inBreakdown && (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface scroll-slim">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-10 px-3 py-3"><CheckBox checked={allSelected} onClick={toggleAll} /></th>
                <th className="w-14 px-2 py-3 text-left"><span className="eyebrow">On/Off</span></th>
                <th className="min-w-[260px] px-3 py-3 text-left"><span className="eyebrow">{levels.find((l) => l.key === level)?.label}</span></th>
                {visibleCols.map((c) => (
                  <th key={c.key} className="px-3 py-3 text-right"><span className="eyebrow">{c.label}</span></th>
                ))}
                <th className="w-12 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sm = statusMeta[r.status];
                const sel = selected.has(r.id);
                const drillable = r.level === "campaign" || r.level === "adset";
                return (
                  <tr key={r.id} className={cn("border-b border-border/60 transition-colors hover:bg-surface-2/40", sel && "bg-primary-soft/40")}>
                    <td className="px-3 py-3"><CheckBox checked={sel} onClick={() => toggleRow(r.id)} /></td>
                    <td className="px-2 py-3"><Switch checked={r.delivery} onCheckedChange={() => toggleDelivery(r)} /></td>
                    <td className="px-3 py-3">
                      {drillable ? (
                        <button onClick={() => drill(r)} className="group flex items-center gap-1.5 text-left">
                          <span className="font-medium text-foreground group-hover:text-primary group-hover:underline">{r.name}</span>
                          <ChevronRight className="size-3.5 text-soft-foreground transition-colors group-hover:text-primary" />
                        </button>
                      ) : (
                        <button onClick={() => setEditRow(r)} className="text-left font-medium text-foreground hover:text-primary hover:underline">{r.name}</button>
                      )}
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={sm.variant} dot>{sm.label}</Badge>
                        {r.parent && !drillable && <span className="truncate text-xs text-soft-foreground">{r.parent}</span>}
                      </div>
                    </td>
                    {visibleCols.map((c) => {
                      if (c.key === "budget") {
                        return (
                          <td key={c.key} className="px-3 py-3 text-right">
                            {r.budget === 0 ? (
                              <span className="text-soft-foreground">—</span>
                            ) : editingId === r.id ? (
                              <input
                                autoFocus
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value.replace(/[^\d]/g, ""))}
                                onBlur={() => saveBudget(r)}
                                onKeyDown={(e) => { if (e.key === "Enter") saveBudget(r); if (e.key === "Escape") setEditingId(null); }}
                                className="tnum h-8 w-24 rounded-md border border-primary bg-surface px-2 text-right text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                              />
                            ) : (
                              <button onClick={() => { setEditingId(r.id); setEditValue(String(r.budget)); }} className="tnum group inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-foreground transition-colors hover:bg-surface-2">
                                {c.format(r)}
                                <Pencil className="size-3 text-soft-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              </button>
                            )}
                          </td>
                        );
                      }
                      return (
                        <td key={c.key} className={cn("tnum px-3 py-3 text-right", c.key === "roas" ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {c.format(r)}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right">
                      <Dropdown
                        align="right"
                        panelClass="w-40"
                        trigger={
                          <span className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
                            <MoreHorizontal className="size-4" />
                          </span>
                        }
                      >
                        {(close) => (
                          <>
                            <MenuRow icon={<Pencil className="size-4" />} onClick={() => { setEditRow(r); close(); }}>Editar</MenuRow>
                            <MenuRow icon={<Copy className="size-4" />} onClick={() => { duplicate(r); close(); }}>Duplicar</MenuRow>
                            <MenuRow icon={<Trash2 className="size-4" />} danger onClick={() => { remove(r); close(); }}>Excluir</MenuRow>
                          </>
                        )}
                      </Dropdown>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4 + visibleCols.length} className="p-4">
                    <EmptyState
                      icon={Search}
                      title="Nenhum item encontrado"
                      description="Ajuste a busca, os filtros ou troque de conta/nível."
                    />
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-border bg-surface-2/40">
                  <td className="px-3 py-3" /><td className="px-2 py-3" />
                  <td className="px-3 py-3"><span className="text-xs font-medium text-foreground">Total · {filtered.length} {levelNoun}</span></td>
                  {visibleCols.map((c) => (
                    <td key={c.key} className="tnum px-3 py-3 text-right text-xs font-medium text-foreground">{colTotal(c.key) ?? "—"}</td>
                  ))}
                  <td className="px-3 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Estrutura espelha o Gerenciador da Meta — ações reais serão religadas ao backend.
      </p>

      {/* Drawer de edição */}
      {editRow && (
        <EditDrawer
          row={editRow}
          onClose={() => setEditRow(null)}
          onSave={(patch) => {
            setRows((rs) => rs.map((x) => (x.id === editRow.id ? { ...x, ...patch } : x)));
            toast.success(`"${patch.name ?? editRow.name}" atualizado.`);
            pushLog(`“${patch.name ?? editRow.name}” editado(a)`);
            setEditRow(null);
          }}
        />
      )}

      {/* Drawer de criação (conjunto/anúncio) */}
      {createKind && (
        <CreateDrawer
          kind={createKind}
          parentName={createKind === "adset" ? focus.campaign?.name : focus.adset?.name}
          onClose={() => setCreateKind(null)}
          onCreate={(name, budget) => {
            const id = `n-${Date.now()}`;
            const base: Row = {
              id,
              account: account.id,
              level: createKind,
              name,
              status: "pausada",
              delivery: false,
              parentId: createKind === "adset" ? focus.campaign?.id : focus.adset?.id,
              parent: createKind === "adset" ? focus.campaign?.name : focus.adset?.name,
              budget: createKind === "adset" ? budget : 0,
              results: 0, reach: 0, impressions: 0, clicks: 0, ctr: 0, cpc: 0, spend: 0, cpa: 0, roas: 0,
            };
            setRows((rs) => [...rs, base]);
            toast.success(`${createKind === "adset" ? "Conjunto" : "Anúncio"} "${name}" criado.`);
            pushLog(`${createKind === "adset" ? "Conjunto" : "Anúncio"} “${name}” criado(a)`);
            setCreateKind(null);
          }}
        />
      )}

      {/* Drawer de regras */}
      <Drawer open={rulesOpen} onClose={() => setRulesOpen(false)} title="Regras automáticas" description="Automatize ações com base no desempenho.">
        <RulesPanel rules={rules} setRules={setRules} onCreate={(t) => pushLog(t)} />
      </Drawer>

      {/* Drawer de filtros */}
      <Drawer
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtros"
        description="Refine a lista por status, veiculação e métricas."
        footer={
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setFilters(emptyFilters)}>Limpar</Button>
            <Button onClick={() => setFiltersOpen(false)}>Aplicar</Button>
          </div>
        }
      >
        <FiltersPanel filters={filters} setFilters={setFilters} />
      </Drawer>

      {/* Drawer de histórico */}
      <Drawer open={logOpen} onClose={() => setLogOpen(false)} title="Histórico de alterações" description="Registro das ações feitas neste gerenciador.">
        <ol className="flex flex-col gap-3">
          {log.map((e) => (
            <li key={e.id} className="flex gap-3">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <div>
                <p className="text-sm text-foreground">{e.text}</p>
                <p className="text-xs text-soft-foreground">{e.when}</p>
              </div>
            </li>
          ))}
        </ol>
      </Drawer>
    </>
  );
}

function FiltersPanel({ filters, setFilters }: { filters: Filters; setFilters: (f: Filters) => void }) {
  const statusList: RowStatus[] = ["ativa", "limitada", "pausada", "reprovada"];
  const toggleStatus = (s: RowStatus) =>
    setFilters({
      ...filters,
      statuses: filters.statuses.includes(s) ? filters.statuses.filter((x) => x !== s) : [...filters.statuses, s],
    });
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow mb-2">Status</p>
        <div className="flex flex-col gap-1.5">
          {statusList.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-left text-sm text-foreground hover:bg-surface-2"
            >
              <CheckBox checked={filters.statuses.includes(s)} />
              {statusMeta[s].label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="eyebrow mb-2">Veiculação</p>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
          {([["all", "Todos"], ["on", "Ativos"], ["off", "Pausados"]] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilters({ ...filters, delivery: k })}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors",
                filters.delivery === k ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <p className="eyebrow">Faixas de métrica</p>
        <DrawerField label="ROAS mínimo">
          <Input value={filters.roasMin} onChange={(e) => setFilters({ ...filters, roasMin: e.target.value.replace(/[^\d.]/g, "") })} placeholder="ex.: 3" />
        </DrawerField>
        <DrawerField label="CPA máximo (R$)">
          <Input value={filters.cpaMax} onChange={(e) => setFilters({ ...filters, cpaMax: e.target.value.replace(/[^\d.]/g, "") })} placeholder="ex.: 60" />
        </DrawerField>
        <DrawerField label="Valor gasto mínimo (R$)">
          <Input value={filters.spendMin} onChange={(e) => setFilters({ ...filters, spendMin: e.target.value.replace(/[^\d.]/g, "") })} placeholder="ex.: 5000" />
        </DrawerField>
      </div>
    </div>
  );
}

/* ── Drawers de conteúdo ── */

function EditDrawer({ row, onClose, onSave }: { row: Row; onClose: () => void; onSave: (patch: Partial<Row>) => void }) {
  const [name, setName] = useState(row.name);
  const [delivery, setDelivery] = useState(row.delivery);
  const [status, setStatus] = useState(row.status);
  const [budget, setBudget] = useState(String(row.budget));
  const noun = row.level === "campaign" ? "campanha" : row.level === "adset" ? "conjunto" : "anúncio";

  return (
    <Drawer
      open
      onClose={onClose}
      title={`Editar ${noun}`}
      description={row.name}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ name, delivery, status, budget: Number(budget) || row.budget })}>Salvar</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <DrawerField label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </DrawerField>
        <div className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2.5">
          <span className="text-sm text-foreground">Veiculação</span>
          <Switch checked={delivery} onCheckedChange={(v) => { setDelivery(v); setStatus(v ? "ativa" : "pausada"); }} />
        </div>
        <DrawerField label="Status">
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value as Row["status"])}>
            <option value="ativa">Ativa</option>
            <option value="pausada">Pausada</option>
            <option value="limitada">Limitada</option>
            <option value="reprovada">Reprovada</option>
          </select>
        </DrawerField>
        {row.level !== "ad" && (
          <DrawerField label="Orçamento diário">
            <div className="flex h-10 items-center rounded-md border border-input bg-surface focus-within:border-border-strong focus-within:ring-2 focus-within:ring-ring/40">
              <span className="pl-3 text-sm text-soft-foreground">R$</span>
              <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))} className="tnum h-full w-full bg-transparent px-2 text-sm text-foreground focus:outline-none" />
            </div>
          </DrawerField>
        )}
      </div>
    </Drawer>
  );
}

function CreateDrawer({ kind, parentName, onClose, onCreate }: { kind: "adset" | "ad"; parentName?: string; onClose: () => void; onCreate: (name: string, budget: number) => void }) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("50");
  // conjunto
  const [location, setLocation] = useState("Brasil");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65+");
  const [gender, setGender] = useState("todos");
  const [interests, setInterests] = useState("");
  const [placement, setPlacement] = useState("auto");
  // anúncio
  const [page, setPage] = useState("Bella Estética");
  const [format, setFormat] = useState("imagem");
  const [primaryText, setPrimaryText] = useState("");
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState("Saiba mais");
  const [url, setUrl] = useState("");

  const noun = kind === "adset" ? "conjunto" : "anúncio";
  return (
    <Drawer
      open
      onClose={onClose}
      title={`Novo ${noun}`}
      description={parentName ? `Dentro de “${parentName}”` : "Avulso — vincule depois ao pai"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={name.trim().length < 2} onClick={() => onCreate(name, Number(budget) || 0)}>Criar {noun}</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <DrawerField label={`Nome do ${noun}`}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "adset" ? "Ex.: Lookalike 1% — 25-45" : "Ex.: Criativo — Depoimento"} />
        </DrawerField>

        {kind === "adset" && (
          <>
            <DrawerField label="Orçamento diário">
              <div className="flex h-10 items-center rounded-md border border-input bg-surface focus-within:border-border-strong focus-within:ring-2 focus-within:ring-ring/40">
                <span className="pl-3 text-sm text-soft-foreground">R$</span>
                <input value={budget} onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))} className="tnum h-full w-full bg-transparent px-2 text-sm text-foreground focus:outline-none" />
              </div>
            </DrawerField>
            <p className="eyebrow pt-1">Público</p>
            <DrawerField label="Localização">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </DrawerField>
            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="Idade mínima">
                <select className={selectCls} value={ageMin} onChange={(e) => setAgeMin(e.target.value)}>
                  {["13", "18", "25", "35", "45", "55"].map((a) => <option key={a}>{a}</option>)}
                </select>
              </DrawerField>
              <DrawerField label="Idade máxima">
                <select className={selectCls} value={ageMax} onChange={(e) => setAgeMax(e.target.value)}>
                  {["24", "34", "44", "54", "65+"].map((a) => <option key={a}>{a}</option>)}
                </select>
              </DrawerField>
            </div>
            <DrawerField label="Gênero">
              <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
                {[["todos", "Todos"], ["homens", "Homens"], ["mulheres", "Mulheres"]].map(([k, l]) => (
                  <button key={k} onClick={() => setGender(k)} className={cn("flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors", gender === k ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground")}>{l}</button>
                ))}
              </div>
            </DrawerField>
            <DrawerField label="Interesses">
              <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="Ex.: skincare, estética" />
            </DrawerField>
            <DrawerField label="Posicionamentos">
              <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1">
                {[["auto", "Automáticos"], ["manual", "Manuais"]].map(([k, l]) => (
                  <button key={k} onClick={() => setPlacement(k)} className={cn("flex-1 rounded px-3 py-1.5 text-xs font-medium transition-colors", placement === k ? "bg-primary-soft text-primary" : "text-muted-foreground hover:text-foreground")}>{l}</button>
                ))}
              </div>
            </DrawerField>
          </>
        )}

        {kind === "ad" && (
          <>
            <DrawerField label="Página / Identidade">
              <select className={selectCls} value={page} onChange={(e) => setPage(e.target.value)}>
                {["Bella Estética", "Clínica Vitalis", "Loja Norte Calçados"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </DrawerField>
            <DrawerField label="Formato">
              <select className={selectCls} value={format} onChange={(e) => setFormat(e.target.value)}>
                {[["imagem", "Imagem única"], ["carrossel", "Carrossel"], ["video", "Vídeo"]].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </DrawerField>
            <DrawerField label="Criativo">
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border-strong bg-surface-2/40 px-4 py-6 text-center">
                <Upload className="size-5 text-soft-foreground" />
                <p className="text-xs text-muted-foreground">Arraste ou clique para enviar</p>
              </div>
            </DrawerField>
            <DrawerField label="Texto principal">
              <Textarea value={primaryText} onChange={(e) => setPrimaryText(e.target.value)} placeholder="Fale com seu público…" />
            </DrawerField>
            <DrawerField label="Título">
              <Input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Chamada curta" />
            </DrawerField>
            <div className="grid grid-cols-2 gap-3">
              <DrawerField label="Botão (CTA)">
                <select className={selectCls} value={cta} onChange={(e) => setCta(e.target.value)}>
                  {["Saiba mais", "Comprar agora", "Cadastre-se", "Enviar mensagem"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </DrawerField>
              <DrawerField label="URL">
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              </DrawerField>
            </div>

            {/* Preview */}
            <div className="rounded-lg border border-border bg-surface">
              <div className="flex items-center gap-2 p-3">
                <div className="size-7 rounded-full bg-surface-2" />
                <div>
                  <p className="text-xs font-medium text-foreground">{page}</p>
                  <p className="text-[10px] text-soft-foreground">Patrocinado</p>
                </div>
              </div>
              {primaryText && <p className="px-3 pb-2 text-xs text-foreground">{primaryText}</p>}
              <div className="grid aspect-[16/9] place-items-center bg-surface-2 text-soft-foreground">
                <ImageIcon className="size-7" />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border p-3">
                <p className="truncate text-xs font-medium text-foreground">{headline || "Título do anúncio"}</p>
                <span className="shrink-0 rounded-md bg-surface-2 px-2 py-1 text-[10px] font-medium text-foreground">{cta}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}

function RulesPanel({ rules, setRules, onCreate }: { rules: Rule[]; setRules: (r: Rule[]) => void; onCreate: (text: string) => void }) {
  const [metric, setMetric] = useState("CPA");
  const [op, setOp] = useState(">");
  const [value, setValue] = useState("80");
  const [action, setAction] = useState("Pausar");
  const [scope, setScope] = useState("Campanhas ativas");

  function add() {
    setRules([...rules, { id: `r-${Date.now()}`, metric, op, value, action, scope }]);
    toast.success("Regra criada.");
    onCreate(`Regra criada: ${metric} ${op} ${value} → ${action}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm text-foreground">
          Quando a métrica atender à condição, executar a ação:
        </p>
        <div className="grid grid-cols-3 gap-2">
          <select className={selectCls} value={metric} onChange={(e) => setMetric(e.target.value)}>
            {["CPA", "ROAS", "Valor gasto", "CTR", "Frequência"].map((m) => <option key={m}>{m}</option>)}
          </select>
          <select className={selectCls} value={op} onChange={(e) => setOp(e.target.value)}>
            <option value=">">maior que</option>
            <option value="<">menor que</option>
          </select>
          <input value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} className={cn(selectCls, "tnum")} />
        </div>
        <select className={selectCls} value={action} onChange={(e) => setAction(e.target.value)}>
          {["Pausar", "Aumentar orçamento 20%", "Reduzir orçamento 20%", "Notificar gestor"].map((a) => <option key={a}>{a}</option>)}
        </select>
        <select className={selectCls} value={scope} onChange={(e) => setScope(e.target.value)}>
          {["Campanhas ativas", "Conjuntos ativos", "Selecionados", "Todas"].map((s) => <option key={s}>{s}</option>)}
        </select>
        <Button onClick={add} className="mt-1">
          <Plus />
          Adicionar regra
        </Button>
      </div>

      <div>
        <p className="eyebrow mb-2">Regras ativas ({rules.length})</p>
        <div className="flex flex-col gap-2">
          {rules.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface p-3">
              <p className="text-sm text-foreground">
                Se <span className="font-medium">{r.metric}</span> {r.op === ">" ? "maior que" : "menor que"}{" "}
                <span className="tnum font-medium">{r.metric === "ROAS" ? `${r.value}x` : r.metric === "CTR" ? `${r.value}%` : `R$ ${r.value}`}</span>
                {" → "}<span className="font-medium text-primary">{r.action}</span>
                <span className="block text-xs text-soft-foreground">{r.scope}</span>
              </p>
              <button onClick={() => setRules(rules.filter((x) => x.id !== r.id))} className="shrink-0 text-soft-foreground hover:text-destructive">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {rules.length === 0 && <p className="text-sm text-soft-foreground">Nenhuma regra ainda.</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Auxiliares ── */

function Crumb({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={active} className={cn("rounded px-1.5 py-0.5 transition-colors", active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground")}>
      {children}
    </button>
  );
}

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function MenuRow({ icon, children, onClick, danger }: { icon: React.ReactNode; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2", danger ? "text-destructive" : "text-foreground")}>
      {icon}
      {children}
    </button>
  );
}

function SelectButton({ icon, label, hint }: { icon?: React.ReactNode; label: string; hint?: string }) {
  return (
    <span className="flex h-10 cursor-pointer items-center gap-2.5 rounded-md border border-border bg-surface px-3 transition-colors hover:border-border-strong">
      {icon}
      <span className="flex flex-col text-left leading-tight">
        {hint && <span className="text-[10px] uppercase tracking-wide text-soft-foreground">{hint}</span>}
        <span className="text-sm font-medium text-foreground">{label}</span>
      </span>
      <ChevronDown className="size-4 text-muted-foreground" />
    </span>
  );
}

function Dropdown({ trigger, children, align = "left", panelClass }: { trigger: React.ReactNode; children: (close: () => void) => React.ReactNode; align?: "left" | "right"; panelClass?: string }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className={cn("absolute z-50 mt-1 min-w-56 rounded-md border border-border bg-popover p-1 shadow-xl", align === "right" ? "right-0" : "left-0", panelClass)}>
            {children(close)}
          </div>
        </>
      )}
    </div>
  );
}

function Item({ active, onClick, children }: { active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={cn("flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2", active ? "text-foreground" : "text-muted-foreground")}>
      {children}
      {active && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

function CheckBox({ checked, onClick }: { checked: boolean; onClick?: () => void }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} onClick={onClick} className={cn("grid size-4 place-items-center rounded border transition-colors", checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface")}>
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

function BulkBtn({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong">
      {icon}
      {children}
    </button>
  );
}

function BreakdownTable({ label, rows, cols }: { label: string; rows: BreakdownRow[]; cols: typeof columns }) {
  const metricCols = cols.filter((c) => c.key !== "budget");
  function total(col: (typeof columns)[number]) {
    if (col.total === "none") return "—";
    const vals = rows.map((r) => r[col.key]);
    const sum = vals.reduce((a, b) => a + b, 0);
    const v = col.total === "avg" ? (rows.length ? sum / rows.length : 0) : sum;
    return col.formatTotal ? col.formatTotal(v) : String(v);
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface scroll-slim">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="min-w-[220px] px-3 py-3 text-left"><span className="eyebrow">{label}</span></th>
            {metricCols.map((c) => <th key={c.key} className="px-3 py-3 text-right"><span className="eyebrow">{c.label}</span></th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/60 transition-colors hover:bg-surface-2/40">
              <td className="px-3 py-3 font-medium text-foreground">{r.name}</td>
              {metricCols.map((c) => (
                <td key={c.key} className={cn("tnum px-3 py-3 text-right", c.key === "roas" ? "font-medium text-foreground" : "text-muted-foreground")}>{c.format(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-surface-2/40">
            <td className="px-3 py-3 text-xs font-medium text-foreground">Total</td>
            {metricCols.map((c) => <td key={c.key} className="tnum px-3 py-3 text-right text-xs font-medium text-foreground">{total(c)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
