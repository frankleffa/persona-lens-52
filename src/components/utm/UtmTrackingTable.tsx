import { useMemo, useState } from "react";
import { useUtmTracking, type UtmTrackingSource } from "@/hooks/useUtmTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUpDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  clientId: string | undefined;
  source?: UtmTrackingSource;
  title?: string;
}

type SortKey = "quantidade" | "valor" | "campaign";

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export default function UtmTrackingTable({ clientId, source = "orders", title = "Tracking UTM Analítico" }: Props) {
  const { rows, loading } = useUtmTracking(clientId, source);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [mediumFilter, setMediumFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("valor");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sources = useMemo(() => Array.from(new Set(rows.map((r) => r.source))).sort(), [rows]);
  const mediums = useMemo(() => Array.from(new Set(rows.map((r) => r.medium))).sort(), [rows]);

  const filtered = useMemo(() => {
    let out = rows;
    if (sourceFilter !== "all") out = out.filter((r) => r.source === sourceFilter);
    if (mediumFilter !== "all") out = out.filter((r) => r.medium === mediumFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          r.campaign.toLowerCase().includes(q) ||
          r.medium.toLowerCase().includes(q) ||
          r.source.toLowerCase().includes(q),
      );
    }
    out = [...out].sort((a, b) => {
      const av = a[sortKey] as number | string;
      const bv = b[sortKey] as number | string;
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return out;
  }, [rows, search, sourceFilter, mediumFilter, sortKey, sortDir]);

  const totalValor = filtered.reduce((s, r) => s + r.valor, 0);
  const totalQtd = filtered.reduce((s, r) => s + r.quantidade, 0);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const hasFilters = search !== "" || sourceFilter !== "all" || mediumFilter !== "all";
  const clear = () => {
    setSearch("");
    setSourceFilter("all");
    setMediumFilter("all");
  };

  const Pill = ({ children }: { children: React.ReactNode }) => (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
      {children}
    </span>
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Agrupado por campanha + medium + source · fonte: {source === "orders" ? "pedidos/depósitos" : "leads"}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar campanha..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos sources</SelectItem>
              {sources.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mediumFilter} onValueChange={setMediumFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue placeholder="Medium" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos mediums</SelectItem>
              {mediums.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear} className="h-9 gap-1 text-xs">
              <X className="h-3 w-3" /> Limpar
            </Button>
          )}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>
                  <button
                    onClick={() => toggleSort("campaign")}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Pill>Campanha</Pill>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </TableHead>
                <TableHead>
                  <Pill>utm_medium</Pill>
                </TableHead>
                <TableHead>
                  <Pill>utm_source</Pill>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => toggleSort("quantidade")}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Pill>Quantidade</Pill>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </TableHead>
                <TableHead className="text-right">
                  <button
                    onClick={() => toggleSort("valor")}
                    className="inline-flex items-center gap-1.5"
                  >
                    <Pill>Valor</Pill>
                    <ArrowUpDown className="h-3 w-3 opacity-50" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Carregando dados...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r, i) => (
                  <TableRow key={`${r.campaign}-${r.medium}-${r.source}-${i}`}>
                    <TableCell
                      className="max-w-[320px] truncate font-medium text-foreground"
                      title={r.campaign}
                    >
                      {r.campaign}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.medium}</TableCell>
                    <TableCell className="text-muted-foreground">{r.source}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.quantidade.toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{fmtBRL(r.valor)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted-foreground">
          <span>{filtered.length} linha(s)</span>
          <span className="font-semibold text-foreground">
            Total: {totalQtd.toLocaleString("pt-BR")} · {fmtBRL(totalValor)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
