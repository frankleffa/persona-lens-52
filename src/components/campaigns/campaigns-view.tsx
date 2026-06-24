"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  Columns3,
  Copy,
  Layers,
  Pause,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Calendar,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
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
} from "./meta-data";

const levels: { key: Level; label: string }[] = [
  { key: "campaign", label: "Campanhas" },
  { key: "adset", label: "Conjuntos" },
  { key: "ad", label: "Anúncios" },
];

export function CampaignsView() {
  const [rows, setRows] = useState<Row[]>(seedRows);
  const [bmId, setBmId] = useState(businesses[0].id);
  const bm = businesses.find((b) => b.id === bmId)!;
  const [accountId, setAccountId] = useState(bm.accounts[0].id);
  const [level, setLevel] = useState<Level>("campaign");
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState<ColumnKey[]>(defaultColumns);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showChart, setShowChart] = useState(false);
  const [breakdown, setBreakdown] = useState<BreakdownKey>("none");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const breakdownDef = breakdowns.find((b) => b.key === breakdown)!;
  const inBreakdown = breakdown !== "none";

  function saveBudget(r: Row) {
    const v = Number(editValue);
    if (!Number.isNaN(v) && v > 0 && v !== r.budget) {
      setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, budget: v } : x)));
      toast.success(`Orçamento de "${r.name}" atualizado.`);
    }
    setEditingId(null);
  }

  const account = bm.accounts.find((a) => a.id === accountId) ?? bm.accounts[0];

  function changeBm(id: string) {
    const next = businesses.find((b) => b.id === id)!;
    setBmId(id);
    setAccountId(next.accounts[0].id);
    setSelected(new Set());
  }
  function changeAccount(id: string) {
    setAccountId(id);
    setSelected(new Set());
  }
  function changeLevel(l: Level) {
    setLevel(l);
    setSelected(new Set());
  }

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          r.account === account.id &&
          r.level === level &&
          r.name.toLowerCase().includes(query.toLowerCase())
      ),
    [rows, account.id, level, query]
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
        x.id === r.id
          ? { ...x, delivery: !x.delivery, status: !x.delivery ? "ativa" : "pausada" }
          : x
      )
    );
  }

  function bulk(action: string) {
    toast.success(`${action} aplicado a ${selected.size} item(ns).`);
    setSelected(new Set());
  }

  function colTotal(key: ColumnKey) {
    const col = columns.find((c) => c.key === key)!;
    if (col.total === "none") return null;
    const vals = filtered.map((r) => r[key]);
    const sum = vals.reduce((a, b) => a + b, 0);
    const v = col.total === "avg" ? (filtered.length ? sum / filtered.length : 0) : sum;
    return col.formatTotal ? col.formatTotal(v) : String(v);
  }

  return (
    <>
      {/* Contexto de conta (BM + conta de anúncio) */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Dropdown
          trigger={
            <SelectButton icon={<Building2 className="size-4 text-muted-foreground" />} label={bm.name} hint="Business" />
          }
        >
          {(close) =>
            businesses.map((b) => (
              <Item
                key={b.id}
                active={b.id === bmId}
                onClick={() => {
                  changeBm(b.id);
                  close();
                }}
              >
                {b.name}
              </Item>
            ))
          }
        </Dropdown>

        <Dropdown
          trigger={<SelectButton label={account.name} hint={account.id} />}
        >
          {(close) =>
            bm.accounts.map((a) => (
              <Item
                key={a.id}
                active={a.id === accountId}
                onClick={() => {
                  changeAccount(a.id);
                  close();
                }}
              >
                <span className="flex flex-col">
                  <span>{a.name}</span>
                  <span className="tnum text-xs text-soft-foreground">{a.id}</span>
                </span>
              </Item>
            ))
          }
        </Dropdown>
      </div>

      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Gerenciador</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            Campanhas
          </h1>
        </div>
        <Button onClick={() => toast("Criação de campanha — em breve")}>
          <Plus />
          Criar
        </Button>
      </div>

      {/* Gráfico de desempenho (colapsável) */}
      {showChart && (
        <Card className="mb-4 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow">Desempenho</p>
              <h2 className="mt-1 text-sm font-medium text-foreground">Valor gasto × Resultados</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-sm bg-[var(--primary)]" />
                Valor gasto
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--chart-2)]" />
                Resultados
              </span>
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
            {level === l.key && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />
            )}
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
            placeholder={`Buscar ${levels.find((l) => l.key === level)?.label.toLowerCase()}…`}
            className="h-9 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm text-foreground placeholder:text-soft-foreground focus:border-border-strong focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>

        <button
          onClick={() => setShowChart((s) => !s)}
          className={cn(
            "flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors",
            showChart
              ? "border-primary/40 bg-primary-soft text-primary"
              : "border-border bg-surface text-foreground hover:border-border-strong"
          )}
        >
          <BarChart3 className="size-4" />
          Gráficos
        </button>

        <Button variant="outline" size="sm" onClick={() => toast("Filtros — em breve")}>
          <SlidersHorizontal />
          Filtros
        </Button>

        {/* Repartição (breakdown) */}
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
              <Item
                key={b.key}
                active={b.key === breakdown}
                onClick={() => {
                  setBreakdown(b.key);
                  close();
                }}
              >
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

        {/* Personalizar colunas */}
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
                      onClick={() =>
                        setVisible((v) =>
                          on ? v.filter((k) => k !== c.key) : [...v, c.key]
                        )
                      }
                      className="flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-sm text-foreground hover:bg-surface-2"
                    >
                      <CheckBox checked={on} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 border-t border-border px-1 pt-1">
                <button
                  onClick={() => setVisible(defaultColumns)}
                  className="w-full rounded px-2.5 py-2 text-left text-xs font-medium text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
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
          <span className="text-sm font-medium text-primary">
            {selected.size} selecionado(s)
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <BulkBtn onClick={() => bulk("Ativar")} icon={<Play className="size-3.5" />}>Ativar</BulkBtn>
            <BulkBtn onClick={() => bulk("Pausar")} icon={<Pause className="size-3.5" />}>Pausar</BulkBtn>
            <BulkBtn onClick={() => bulk("Duplicar")} icon={<Copy className="size-3.5" />}>Duplicar</BulkBtn>
            <BulkBtn onClick={() => bulk("Excluir")} icon={<Trash2 className="size-3.5" />}>Excluir</BulkBtn>
            <button
              onClick={() => setSelected(new Set())}
              className="ml-1 rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          </div>
        </div>
      )}

      {/* Repartição (breakdown) */}
      {inBreakdown && (
        <BreakdownTable label={breakdownDef.label} rows={breakdownDef.rows} cols={visibleCols} />
      )}

      {/* Tabela */}
      {!inBreakdown && (
      <div className="overflow-x-auto rounded-lg border border-border bg-surface scroll-slim">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-10 px-3 py-3">
                <CheckBox checked={allSelected} onClick={toggleAll} />
              </th>
              <th className="w-14 px-2 py-3 text-left">
                <span className="eyebrow">On/Off</span>
              </th>
              <th className="min-w-[260px] px-3 py-3 text-left">
                <span className="eyebrow">
                  {levels.find((l) => l.key === level)?.label}
                </span>
              </th>
              {visibleCols.map((c) => (
                <th key={c.key} className="px-3 py-3 text-right">
                  <span className="eyebrow">{c.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const sm = statusMeta[r.status];
              const sel = selected.has(r.id);
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b border-border/60 transition-colors hover:bg-surface-2/40",
                    sel && "bg-primary-soft/40"
                  )}
                >
                  <td className="px-3 py-3">
                    <CheckBox checked={sel} onClick={() => toggleRow(r.id)} />
                  </td>
                  <td className="px-2 py-3">
                    <Switch checked={r.delivery} onCheckedChange={() => toggleDelivery(r)} />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge variant={sm.variant} dot>{sm.label}</Badge>
                      {r.parent && (
                        <span className="truncate text-xs text-soft-foreground">{r.parent}</span>
                      )}
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
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveBudget(r);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="tnum h-8 w-24 rounded-md border border-primary bg-surface px-2 text-right text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                            />
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(r.id);
                                setEditValue(String(r.budget));
                              }}
                              className="tnum group inline-flex items-center gap-1.5 rounded px-1.5 py-1 text-foreground transition-colors hover:bg-surface-2"
                            >
                              {c.format(r)}
                              <Pencil className="size-3 text-soft-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                          )}
                        </td>
                      );
                    }
                    return (
                      <td
                        key={c.key}
                        className={cn(
                          "tnum px-3 py-3 text-right",
                          c.key === "roas" ? "font-medium text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {c.format(r)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={3 + visibleCols.length} className="px-3 py-12 text-center text-sm text-muted-foreground">
                  Nenhum item neste nível para esta conta.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-surface-2/40">
                <td className="px-3 py-3" />
                <td className="px-2 py-3" />
                <td className="px-3 py-3">
                  <span className="text-xs font-medium text-foreground">
                    Total · {filtered.length} {level === "campaign" ? "campanhas" : level === "adset" ? "conjuntos" : "anúncios"}
                  </span>
                </td>
                {visibleCols.map((c) => (
                  <td key={c.key} className="tnum px-3 py-3 text-right text-xs font-medium text-foreground">
                    {colTotal(c.key) ?? "—"}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      )}

      <p className="mt-8 text-center text-xs text-soft-foreground">
        Estrutura espelha o Gerenciador da Meta — ações reais serão religadas ao backend.
      </p>
    </>
  );
}

/* ── Auxiliares ── */

function SelectButton({
  icon,
  label,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
}) {
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

function Dropdown({
  trigger,
  children,
  align = "left",
  panelClass,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: "left" | "right";
  panelClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div
            className={cn(
              "absolute z-50 mt-1 min-w-56 rounded-md border border-border bg-popover p-1 shadow-xl",
              align === "right" ? "right-0" : "left-0",
              panelClass
            )}
          >
            {children(close)}
          </div>
        </>
      )}
    </div>
  );
}

function Item({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-2",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      {children}
      {active && <Check className="size-4 shrink-0 text-primary" />}
    </button>
  );
}

function CheckBox({ checked, onClick }: { checked: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "grid size-4 place-items-center rounded border transition-colors",
        checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong bg-surface"
      )}
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}

function BulkBtn({
  onClick,
  icon,
  children,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-border-strong"
    >
      {icon}
      {children}
    </button>
  );
}

function BreakdownTable({
  label,
  rows,
  cols,
}: {
  label: string;
  rows: BreakdownRow[];
  cols: typeof columns;
}) {
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
            <th className="min-w-[220px] px-3 py-3 text-left">
              <span className="eyebrow">{label}</span>
            </th>
            {metricCols.map((c) => (
              <th key={c.key} className="px-3 py-3 text-right">
                <span className="eyebrow">{c.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-border/60 transition-colors hover:bg-surface-2/40">
              <td className="px-3 py-3 font-medium text-foreground">{r.name}</td>
              {metricCols.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    "tnum px-3 py-3 text-right",
                    c.key === "roas" ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {c.format(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border bg-surface-2/40">
            <td className="px-3 py-3 text-xs font-medium text-foreground">Total</td>
            {metricCols.map((c) => (
              <td key={c.key} className="tnum px-3 py-3 text-right text-xs font-medium text-foreground">
                {total(c)}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
