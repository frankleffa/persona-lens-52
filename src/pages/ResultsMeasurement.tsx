import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useManagerClients } from "@/hooks/useManagerClients";
import { useMeasurementData } from "@/hooks/useMeasurementData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const fmtBRL = (v: string | number | null) =>
  v === "" || v == null ? "" : `R$ ${Number(v).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtNum = (v: string | number | null) =>
  v === "" || v == null ? "" : Number(v).toLocaleString("pt-BR");
const fmtPct = (v: string | number | null) =>
  v === "" || v == null ? "" : `${(Number(v)*100).toFixed(1)}%`;
const fmtX = (v: string | number | null) =>
  v === "" || v == null ? "" : `${Number(v).toFixed(2)}`;

type Formatter = (v: string | number | null) => string;

interface MonthData { p: string; r: string; }
type MonthMap = Record<string, MonthData>;

interface SpreadsheetData {
  investimento: MonthMap; receita: MonthMap; taxaConv: MonthMap; transacoes: MonthMap;
  sessoesGeral: MonthMap; sessoesMidia: MonthMap;
  fbInvest: MonthMap; fbSessoes: MonthMap; googleInvest: MonthMap; googleSessoes: MonthMap;
}

const initM = (): MonthMap => MONTHS.reduce((a,m)=>({...a,[m]:{p:"",r:""}}),{} as MonthMap);
const defaultData = (): SpreadsheetData => ({
  investimento:initM(), receita:initM(), taxaConv:initM(), transacoes:initM(),
  sessoesGeral:initM(), sessoesMidia:initM(),
  fbInvest:initM(), fbSessoes:initM(), googleInvest:initM(), googleSessoes:initM(),
});

const calc = (a: string | number, b: string | number, op: string) => {
  const x = Number(a), y = Number(b);
  if(!a && a !== 0 || !b && b !== 0) return "";
  if(op === "div") return y > 0 ? x/y : "";
  if(op === "pct") return y > 0 ? x/y : "";
  return "";
};

// ── Editable Cell ──────────────────────────────────────────────

interface EditableCellProps {
  value: string | number;
  onChange?: (val: string) => void;
  fmt?: Formatter;
  editable?: boolean;
  isCalc?: boolean;
  highlight?: "green" | "red" | null;
}

const EditableCell = ({ value, onChange, fmt, editable = true, isCalc = false, highlight }: EditableCellProps) => {
  const [editing, setEditing] = useState(false);
  const [tmp, setTmp] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  const display = fmt ? fmt(value) : value;
  const empty = value === "" || value == null;

  if (editing && editable) {
    return (
      <input
        ref={ref}
        type="number"
        step="any"
        value={tmp}
        onChange={e => setTmp(e.target.value)}
        onBlur={() => { onChange?.(tmp); setEditing(false); }}
        onKeyDown={e => {
          if (e.key === "Enter") { onChange?.(tmp); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-full h-full border-none outline-none text-right font-mono text-[11px] font-semibold"
        style={{
          background:"rgba(28,156,240,0.1)", color:"var(--accent)", padding:"0 6px", boxSizing:"border-box",
        }}
      />
    );
  }

  let color = "var(--text)";
  if (editable && !isCalc) color = "var(--accent)";
  if (isCalc) color = "var(--muted)";
  if (highlight === "green") color = "var(--pos)";
  if (highlight === "red") color = "var(--neg)";

  return (
    <div
      onClick={() => { if (editable) { setTmp(String(value || "")); setEditing(true); } }}
      className="w-full h-full flex items-center justify-end font-mono text-[11px]"
      style={{
        padding:"0 6px", fontWeight:empty?400:600, cursor:editable?"text":"default",
        color:empty?"rgba(240,236,230,0.2)":color,
        background: editable && !isCalc ? "rgba(28,156,240,0.03)" : "transparent",
        boxSizing:"border-box",
      }}
    >
      {empty ? "—" : display}
    </div>
  );
};

// ── Row / Section types ────────────────────────────────────────

interface RowDef {
  key: string; label: string; field?: keyof SpreadsheetData;
  calc?: boolean; fmt: Formatter;
  val?: (m: string, t: "p" | "r") => string | number;
}

interface SectionDef { id: string; label: string; accent: string; rows: RowDef[]; }

// ── Main Page ──────────────────────────────────────────────────

export default function ResultsMeasurement() {
  const [data, setData] = useState<SpreadsheetData>(defaultData);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { clients } = useManagerClients();
  const { data: metrics, isLoading: metricsLoading } = useMeasurementData(
    selectedClient || null,
    selectedYear
  );

  const clientLabel = useMemo(() =>
    clients.find(c => c.id === selectedClient)?.client_label || "",
    [clients, selectedClient]
  );

  // Auto-fill "Realizado" from metrics
  useEffect(() => {
    if (!metrics) return;
    setData(prev => {
      const next = { ...prev };
      const fields: (keyof SpreadsheetData)[] = [
        "investimento","receita","taxaConv","transacoes",
        "sessoesGeral","sessoesMidia","fbInvest","fbSessoes","googleInvest","googleSessoes"
      ];
      fields.forEach(f => { next[f] = { ...prev[f] }; });

      for (const agg of metrics) {
        const m = agg.month;
        next.investimento[m] = { ...prev.investimento[m], r: agg.totalSpend > 0 ? String(agg.totalSpend) : "" };
        next.receita[m] = { ...prev.receita[m], r: agg.totalRevenue > 0 ? String(agg.totalRevenue) : "" };
        next.transacoes[m] = { ...prev.transacoes[m], r: agg.totalConversions > 0 ? String(agg.totalConversions) : "" };
        next.sessoesGeral[m] = { ...prev.sessoesGeral[m], r: agg.totalClicks > 0 ? String(agg.totalClicks) : "" };
        next.sessoesMidia[m] = { ...prev.sessoesMidia[m], r: agg.mediaClicks > 0 ? String(agg.mediaClicks) : "" };
        next.fbInvest[m] = { ...prev.fbInvest[m], r: agg.metaSpend > 0 ? String(agg.metaSpend) : "" };
        next.fbSessoes[m] = { ...prev.fbSessoes[m], r: agg.metaClicks > 0 ? String(agg.metaClicks) : "" };
        next.googleInvest[m] = { ...prev.googleInvest[m], r: agg.googleSpend > 0 ? String(agg.googleSpend) : "" };
        next.googleSessoes[m] = { ...prev.googleSessoes[m], r: agg.googleClicks > 0 ? String(agg.googleClicks) : "" };
        const convRate = agg.totalClicks > 0 ? agg.totalConversions / agg.totalClicks : 0;
        next.taxaConv[m] = { ...prev.taxaConv[m], r: convRate > 0 ? String(convRate) : "" };
      }
      return next;
    });
  }, [metrics]);

  const upd = useCallback((field: keyof SpreadsheetData, month: string, tipo: "p" | "r", val: string) => {
    setData(prev => ({
      ...prev,
      [field]: { ...prev[field], [month]: { ...prev[field][month], [tipo]: val } },
    }));
  }, []);

  const g = (f: keyof SpreadsheetData, m: string, t: "p" | "r") => data[f]?.[m]?.[t] ?? "";

  const sections: SectionDef[] = [
    {
      id: "geral", label: "GERAL", accent: "var(--accent)",
      rows: [
        { key:"investimento", label:"INVESTIMENTO TOTAL", field:"investimento", fmt:fmtBRL },
        { key:"receita", label:"RECEITA CAPTADA", field:"receita", fmt:fmtBRL },
        { key:"roas", label:"ROAS SOBRE CAPTADO", calc:true, fmt:fmtX,
          val:(m,t)=>calc(g("receita",m,t),g("investimento",m,t),"div") },
        { key:"taxaConv", label:"TAXA DE CONVERSÃO", field:"taxaConv", fmt:fmtPct },
        { key:"transacoes", label:"TRANSAÇÕES", field:"transacoes", fmt:fmtNum },
        { key:"ticket", label:"TICKET MÉDIO", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("receita",m,t),g("transacoes",m,t),"div") },
      ],
    },
    {
      id: "sessoes", label: "SESSÕES & TRÁFEGO", accent: "#f7b928",
      rows: [
        { key:"sessoesGeral", label:"SESSÕES (GERAL)", field:"sessoesGeral", fmt:fmtNum },
        { key:"cpsGeral", label:"CPS (GERAL)", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("investimento",m,t),g("sessoesGeral",m,t),"div") },
        { key:"sessoesMidia", label:"SESSÕES MÍDIA", field:"sessoesMidia", fmt:fmtNum },
        { key:"cpsMidia", label:"CPS (MÍDIA)", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("investimento",m,t),g("sessoesMidia",m,t),"div") },
        { key:"pctSessoes", label:"% SESSÕES MÍDIA", calc:true, fmt:fmtPct,
          val:(m,t)=>calc(g("sessoesMidia",m,t),g("sessoesGeral",m,t),"pct") },
      ],
    },
    {
      id: "facebook", label: "META ADS", accent: "#0081FB",
      rows: [
        { key:"fbInvest", label:"INVESTIMENTO", field:"fbInvest", fmt:fmtBRL },
        { key:"fbSessoes", label:"SESSÕES", field:"fbSessoes", fmt:fmtNum },
        { key:"cpsFb", label:"CPS", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("fbInvest",m,t),g("fbSessoes",m,t),"div") },
      ],
    },
    {
      id: "google", label: "GOOGLE ADS", accent: "#4ADE80",
      rows: [
        { key:"googleInvest", label:"INVESTIMENTO", field:"googleInvest", fmt:fmtBRL },
        { key:"googleSessoes", label:"SESSÕES", field:"googleSessoes", fmt:fmtNum },
        { key:"cpsGoogle", label:"CPS", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("googleInvest",m,t),g("googleSessoes",m,t),"div") },
      ],
    },
  ];

  const colW = 88;
  const labelW = 190;
  const totalW = labelW + MONTHS.length * colW * 2;
  const hasData = !!metrics && metrics.some(m => m.totalSpend > 0 || m.totalRevenue > 0);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen bg-bg p-4 font-sans">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto mb-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-accent" />
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold tracking-[1.5px] uppercase mb-0.5">
              Mensuração de Resultados
            </p>
            <h1 className="text-lg font-bold text-foreground">
              {clientLabel || "Selecione um cliente"}
            </h1>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {hasData && (
            <Badge className="bg-pos/10 text-pos border-pos/20 text-[10px] font-medium">
              ● Dados reais
            </Badge>
          )}
          {selectedClient && !hasData && !metricsLoading && (
            <Badge variant="outline" className="border-[#f7b928]/30 text-[#f7b928] text-[10px]">
              Sem dados em {selectedYear}
            </Badge>
          )}

          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[90px] h-8 bg-surface border-surface2 text-foreground text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px] h-8 bg-surface border-surface2 text-foreground text-xs">
              <SelectValue placeholder="Selecione o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clients.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.client_label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Spreadsheet */}
      <div ref={scrollRef} className="max-w-[1400px] mx-auto overflow-x-auto rounded-xl border border-surface2 transition-opacity duration-300"
        style={{ opacity: metricsLoading ? 0.5 : 1, background: "var(--surface)" }}
      >
        <div style={{minWidth:totalW}}>
          {/* Month headers */}
          <div className="flex sticky top-0 z-10">
            <div style={{width:labelW,minWidth:labelW}} className="bg-bg flex items-center justify-center border-r border-surface2">
              <span className="text-[10px] font-bold text-muted-foreground tracking-wider">MÉTRICAS</span>
            </div>
            {MONTHS.map(m => (
              <div key={m} style={{width:colW*2,minWidth:colW*2}} className="bg-bg text-center border-r border-surface2">
                <div className="py-1.5 px-1 text-[10px] font-bold tracking-wide uppercase text-foreground font-sans">
                  {m}
                </div>
              </div>
            ))}
          </div>

          {/* Previsto / Realizado sub-header */}
          <div className="flex sticky top-[28px] z-10">
            <div style={{width:labelW,minWidth:labelW}} className="bg-surface border-r border-surface2 h-6" />
            {MONTHS.map(m => (
              <div key={m} style={{width:colW*2,minWidth:colW*2}} className="flex border-r border-surface2">
                <div className="flex-1 flex items-center justify-center" style={{background:"rgba(28,156,240,0.12)"}}>
                  <span className="text-[9px] font-bold text-accent tracking-wider">PREV</span>
                </div>
                <div className="flex-1 bg-surface flex items-center justify-center">
                  <span className="text-[9px] font-bold text-muted-foreground tracking-wider">REAL</span>
                </div>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {sections.map(sec => (
            <div key={sec.id}>
              {/* Section header */}
              <div className="flex" style={{background:"var(--bg)"}}>
                <div style={{width:labelW,minWidth:labelW}} className="px-3 py-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{background:sec.accent}} />
                  <span className="text-[10px] font-extrabold text-foreground tracking-[1.5px]">{sec.label}</span>
                </div>
                {MONTHS.map(m => <div key={m} style={{width:colW*2,minWidth:colW*2}} />)}
              </div>

              {sec.rows.map((row, ri) => {
                const even = ri % 2 === 0;
                const rowBg = even ? "var(--surface)" : "var(--surface2)";
                return (
                  <div key={row.key} className="flex" style={{borderBottom:"1px solid var(--surface2)"}}>
                    <div
                      style={{width:labelW,minWidth:labelW,background:rowBg}}
                      className="px-3 flex items-center h-8 border-r border-surface2 text-[11px] font-sans"
                    >
                      {row.calc && <span className="text-muted-foreground mr-1 text-[9px]">ƒ</span>}
                      <span style={{
                        fontWeight:row.calc?500:600,
                        color:row.calc?"var(--muted)":"var(--text)",
                        fontStyle:row.calc?"italic":"normal",
                      }}>
                        {row.label}
                      </span>
                    </div>
                    {MONTHS.map(m => {
                      const pVal = row.calc && row.val ? row.val(m, "p") : row.field ? g(row.field, m, "p") : "";
                      const rVal = row.calc && row.val ? row.val(m, "r") : row.field ? g(row.field, m, "r") : "";
                      let rHighlight: "green" | "red" | null = null;
                      if (row.key === "roas" && rVal !== "" && pVal !== "") {
                        rHighlight = Number(rVal) >= Number(pVal) ? "green" : "red";
                      }
                      const realizadoEditable = !row.calc && !hasData;
                      return (
                        <div key={m} style={{width:colW*2,minWidth:colW*2}} className="flex border-r border-surface2">
                          <div style={{width:colW,height:32,background:rowBg,borderRight:"1px solid var(--surface2)"}}>
                            <EditableCell
                              value={pVal} fmt={row.fmt} editable={!row.calc} isCalc={!!row.calc}
                              onChange={v => row.field && upd(row.field, m, "p", v)}
                            />
                          </div>
                          <div style={{width:colW,height:32,background:rowBg}}>
                            <EditableCell
                              value={rVal} fmt={row.fmt} editable={realizadoEditable}
                              isCalc={!!row.calc} highlight={rHighlight}
                              onChange={v => row.field && upd(row.field, m, "r", v)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="max-w-[1400px] mx-auto mt-3 flex gap-5 flex-wrap px-1">
        <span className="text-[10px] text-muted-foreground">
          <span className="text-accent font-bold">Azul</span> = editável
        </span>
        <span className="text-[10px] text-muted-foreground">
          <span className="italic">ƒ</span> = calculado
        </span>
        <span className="text-[10px] text-muted-foreground">
          <span className="text-accent font-bold">PREV</span> = meta · <span className="font-semibold text-foreground">REAL</span> = dado via API
        </span>
      </div>
    </div>
  );
}
