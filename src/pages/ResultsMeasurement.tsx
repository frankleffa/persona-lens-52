import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useManagerClients } from "@/hooks/useManagerClients";
import { useMeasurementData } from "@/hooks/useMeasurementData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, ClipboardList, Loader2 } from "lucide-react";

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
  isForecast?: boolean;
}

const EditableCell = ({ value, onChange, fmt, editable = true, isCalc = false, highlight, isForecast }: EditableCellProps) => {
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
        className="w-full h-full border-none outline-hidden text-right text-[11px] font-semibold font-mono bg-blue-50 text-blue-700 px-1.5 ring-1 ring-blue-300 rounded-sm"
      />
    );
  }

  let textColor = "text-gray-700";
  if (editable && !isCalc && isForecast) textColor = "text-blue-600";
  if (isCalc) textColor = "text-gray-400 italic";
  if (highlight === "green") textColor = "text-emerald-600 font-bold";
  if (highlight === "red") textColor = "text-red-500 font-bold";

  return (
    <div
      onClick={() => { if (editable) { setTmp(String(value || "")); setEditing(true); } }}
      className={`w-full h-full flex items-center justify-end font-mono text-[11px] px-1.5 transition-colors
        ${editable && !isCalc ? "cursor-text hover:bg-blue-50/60" : "cursor-default"}
        ${empty ? "text-gray-300" : textColor}
        ${!empty && !isCalc ? "font-semibold" : "font-normal"}
      `}
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
      id: "geral", label: "GERAL", accent: "#3b82f6",
      rows: [
        { key:"investimento", label:"Investimento Total", field:"investimento", fmt:fmtBRL },
        { key:"receita", label:"Receita Captada", field:"receita", fmt:fmtBRL },
        { key:"roas", label:"ROAS sobre Captado", calc:true, fmt:fmtX,
          val:(m,t)=>calc(g("receita",m,t),g("investimento",m,t),"div") },
        { key:"taxaConv", label:"Taxa de Conversão", field:"taxaConv", fmt:fmtPct },
        { key:"transacoes", label:"Transações", field:"transacoes", fmt:fmtNum },
        { key:"ticket", label:"Ticket Médio", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("receita",m,t),g("transacoes",m,t),"div") },
      ],
    },
    {
      id: "sessoes", label: "SESSÕES & TRÁFEGO", accent: "#f59e0b",
      rows: [
        { key:"sessoesGeral", label:"Sessões (Geral)", field:"sessoesGeral", fmt:fmtNum },
        { key:"cpsGeral", label:"CPS (Geral)", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("investimento",m,t),g("sessoesGeral",m,t),"div") },
        { key:"sessoesMidia", label:"Sessões Mídia", field:"sessoesMidia", fmt:fmtNum },
        { key:"cpsMidia", label:"CPS (Mídia)", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("investimento",m,t),g("sessoesMidia",m,t),"div") },
        { key:"pctSessoes", label:"% Sessões Mídia", calc:true, fmt:fmtPct,
          val:(m,t)=>calc(g("sessoesMidia",m,t),g("sessoesGeral",m,t),"pct") },
      ],
    },
    {
      id: "facebook", label: "META ADS", accent: "#3b82f6",
      rows: [
        { key:"fbInvest", label:"Investimento", field:"fbInvest", fmt:fmtBRL },
        { key:"fbSessoes", label:"Sessões", field:"fbSessoes", fmt:fmtNum },
        { key:"cpsFb", label:"CPS", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("fbInvest",m,t),g("fbSessoes",m,t),"div") },
      ],
    },
    {
      id: "google", label: "GOOGLE ADS", accent: "#10b981",
      rows: [
        { key:"googleInvest", label:"Investimento", field:"googleInvest", fmt:fmtBRL },
        { key:"googleSessoes", label:"Sessões", field:"googleSessoes", fmt:fmtNum },
        { key:"cpsGoogle", label:"CPS", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("googleInvest",m,t),g("googleSessoes",m,t),"div") },
      ],
    },
  ];

  const colW = 80;
  const labelW = 170;
  const totalW = labelW + MONTHS.length * colW * 2;
  const hasData = !!metrics && metrics.some(m => m.totalSpend > 0 || m.totalRevenue > 0);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="min-h-screen bg-white pt-20 lg:pt-8 lg:ml-64 p-4 sm:p-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Mensuração de Resultados
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {clientLabel ? `Acompanhamento mensal — ${clientLabel}` : "Compare metas previstas vs. dados reais de cada mês"}
            </p>
          </div>

          <div className="flex gap-2 items-center">
            {metricsLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            )}
            {hasData && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Dados reais
              </span>
            )}
            {selectedClient && !hasData && !metricsLoading && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                Sem dados em {selectedYear}
              </span>
            )}

            <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-[88px] h-8 bg-white border-gray-200 text-gray-700 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger className="w-[200px] h-8 bg-white border-gray-200 text-gray-700 text-xs rounded-lg">
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

        {/* Empty State */}
        {!selectedClient && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <ClipboardList className="h-7 w-7 text-gray-400" />
            </div>
            <h2 className="text-base font-semibold text-gray-800 mb-1">Selecione um cliente</h2>
            <p className="text-sm text-gray-500 max-w-sm">
              Escolha um cliente acima para visualizar e planejar a mensuração mensal de resultados.
            </p>
          </div>
        )}

        {/* Spreadsheet */}
        {selectedClient && (
          <>
            <div
              className="overflow-x-auto rounded-xl border border-gray-200 shadow-xs transition-opacity duration-300"
              style={{ opacity: metricsLoading ? 0.5 : 1 }}
            >
              <div style={{ minWidth: totalW }}>
                {/* Month headers */}
                <div className="flex">
                  <div style={{ width: labelW, minWidth: labelW }} className="bg-gray-50 flex items-center justify-center border-r border-b border-gray-200">
                    <span className="text-[10px] font-semibold text-gray-500 tracking-wider uppercase">Métricas</span>
                  </div>
                  {MONTHS.map(m => (
                    <div key={m} style={{ width: colW * 2, minWidth: colW * 2 }} className="bg-gray-50 text-center border-r border-b border-gray-200">
                      <div className="py-2 text-[10px] font-bold tracking-wide uppercase text-gray-600">
                        {m}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Prev / Real sub-header */}
                <div className="flex">
                  <div style={{ width: labelW, minWidth: labelW }} className="bg-white border-r border-b border-gray-200 h-6" />
                  {MONTHS.map(m => (
                    <div key={m} style={{ width: colW * 2, minWidth: colW * 2 }} className="flex border-r border-b border-gray-200">
                      <div className="flex-1 flex items-center justify-center bg-blue-50/70">
                        <span className="text-[9px] font-bold text-blue-500 tracking-wider">PREV</span>
                      </div>
                      <div className="flex-1 bg-gray-50 flex items-center justify-center border-l border-gray-100">
                        <span className="text-[9px] font-bold text-gray-400 tracking-wider">REAL</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Data rows */}
                {sections.map(sec => (
                  <div key={sec.id}>
                    {/* Section header */}
                    <div className="flex bg-gray-50/80 border-b border-gray-200">
                      <div style={{ width: labelW, minWidth: labelW }} className="px-3 py-2 flex items-center gap-2">
                        <div className="w-0.5 h-4 rounded-full" style={{ background: sec.accent }} />
                        <span className="text-[10px] font-extrabold text-gray-700 tracking-[1.5px]">{sec.label}</span>
                      </div>
                      {MONTHS.map(m => <div key={m} style={{ width: colW * 2, minWidth: colW * 2 }} />)}
                    </div>

                    {sec.rows.map((row, ri) => {
                      const even = ri % 2 === 0;
                      return (
                        <div key={row.key} className={`flex border-b border-gray-100 ${even ? "bg-white" : "bg-gray-50/40"}`}>
                          <div
                            style={{ width: labelW, minWidth: labelW }}
                            className="px-3 flex items-center h-8 border-r border-gray-200 text-[11px]"
                          >
                            {row.calc && <span className="text-gray-400 mr-1 text-[9px]">ƒ</span>}
                            <span className={row.calc ? "text-gray-400 italic font-normal" : "text-gray-700 font-semibold"}>
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
                              <div key={m} style={{ width: colW * 2, minWidth: colW * 2 }} className="flex border-r border-gray-100">
                                <div style={{ width: colW, height: 32 }} className="border-r border-gray-100">
                                  <EditableCell
                                    value={pVal} fmt={row.fmt} editable={!row.calc} isCalc={!!row.calc}
                                    isForecast
                                    onChange={v => row.field && upd(row.field, m, "p", v)}
                                  />
                                </div>
                                <div style={{ width: colW, height: 32 }}>
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
            <div className="mt-4 flex gap-6 flex-wrap px-1">
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" />
                Editável (meta)
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <span className="italic text-gray-400 mr-0.5">ƒ</span>
                Calculado automaticamente
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
                <BarChart3 className="h-3 w-3 text-emerald-500" />
                Dado via API
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
