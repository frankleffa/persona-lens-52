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
        style={{
          width:"100%", height:"100%", border:"none", outline:"none", background:"#EBF0FF",
          textAlign:"right", padding:"0 6px", fontSize:11, fontFamily:"'IBM Plex Mono',monospace",
          color:"#1a3fb5", fontWeight:600, boxSizing:"border-box",
        }}
      />
    );
  }

  let color = "#222";
  if (editable && !isCalc) color = "#1a3fb5";
  if (isCalc) color = "#333";
  if (highlight === "green") color = "#0a7c42";
  if (highlight === "red") color = "#c0392b";

  return (
    <div
      onClick={() => { if (editable) { setTmp(String(value || "")); setEditing(true); } }}
      style={{
        width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"flex-end",
        padding:"0 6px", fontSize:11, fontWeight:empty?400:600, cursor:editable?"text":"default",
        color:empty?"#ccc":color, fontFamily:"'IBM Plex Mono',monospace",
        background: editable && !isCalc ? "rgba(26,63,181,0.02)" : "transparent",
        boxSizing:"border-box",
      }}
    >
      {empty ? "—" : display}
    </div>
  );
};

// ── Section / Row types ────────────────────────────────────────

interface RowDef {
  key: string; label: string; field?: keyof SpreadsheetData;
  calc?: boolean; fmt: Formatter;
  val?: (m: string, t: "p" | "r") => string | number;
}

interface SectionDef { id: string; label: string; color: string; rows: RowDef[]; }

// ── Main Page ──────────────────────────────────────────────────

export default function ResultsMeasurement() {
  const [data, setData] = useState<SpreadsheetData>(defaultData);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { clients, loading: clientsLoading } = useManagerClients();
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
        // Taxa de conversão
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
      id: "geral", label: "GERAL", color: "#1a1a2e",
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
      id: "sessoes", label: "SESSÕES & TRÁFEGO", color: "#2c3e50",
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
      id: "facebook", label: "FACEBOOK / META", color: "#1877F2",
      rows: [
        { key:"fbInvest", label:"INVESTIMENTO", field:"fbInvest", fmt:fmtBRL },
        { key:"fbSessoes", label:"SESSÕES", field:"fbSessoes", fmt:fmtNum },
        { key:"cpsFb", label:"CPS", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("fbInvest",m,t),g("fbSessoes",m,t),"div") },
      ],
    },
    {
      id: "google", label: "GOOGLE ADS", color: "#34A853",
      rows: [
        { key:"googleInvest", label:"INVESTIMENTO", field:"googleInvest", fmt:fmtBRL },
        { key:"googleSessoes", label:"SESSÕES", field:"googleSessoes", fmt:fmtNum },
        { key:"cpsGoogle", label:"CPS", calc:true, fmt:fmtBRL,
          val:(m,t)=>calc(g("googleInvest",m,t),g("googleSessoes",m,t),"div") },
      ],
    },
  ];

  const colW = 88;
  const labelW = 180;
  const totalW = labelW + MONTHS.length * colW * 2;
  const hasData = !!metrics && metrics.some(m => m.totalSpend > 0 || m.totalRevenue > 0);
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

  return (
    <div className="page-container" style={{ minHeight:"100vh", background:"#0e1117", padding:"16px 12px", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* Top bar */}
      <div style={{maxWidth:1200,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:6,height:32,borderRadius:3,background:"linear-gradient(180deg,#c0392b,#e74c3c)"}} />
          <div>
            <div style={{fontSize:10,color:"#556",fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>
              Planilha de Acompanhamento
            </div>
            <div style={{color:"#f0f0f0",fontSize:20,fontWeight:800}}>
              {clientLabel || "Selecione um cliente"}
            </div>
          </div>
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {hasData && (
            <Badge variant="outline" className="border-green-500/50 text-green-400 text-[10px]">
              ● Dados reais
            </Badge>
          )}
          {selectedClient && !hasData && !metricsLoading && (
            <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-[10px]">
              Sem dados para {selectedYear}
            </Badge>
          )}

          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px] h-9 bg-[#1a1a2e] border-[#333] text-white text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClient} onValueChange={setSelectedClient}>
            <SelectTrigger className="w-[200px] h-9 bg-[#1a1a2e] border-[#333] text-white text-xs">
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
      <div ref={scrollRef} style={{
        maxWidth:1200,margin:"0 auto",overflowX:"auto",borderRadius:10,
        border:"1px solid #252530",background:"#fff",
        boxShadow:"0 8px 40px rgba(0,0,0,0.4)",
        opacity: metricsLoading ? 0.6 : 1, transition: "opacity 0.3s",
      }}>
        <div style={{minWidth:totalW}}>
          {/* Month headers */}
          <div style={{display:"flex",position:"sticky",top:0,zIndex:10}}>
            <div style={{width:labelW,minWidth:labelW,background:"#1a1a2e",borderRight:"1px solid #2a2a3e",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:10,fontWeight:700,color:"#888",letterSpacing:1}}>MÉTRICAS</span>
            </div>
            {MONTHS.map(m => (
              <div key={m} style={{width:colW*2,minWidth:colW*2,background:"#1a1a2e",textAlign:"center",borderRight:"1px solid #2a2a3e"}}>
                <div style={{padding:"6px 4px",fontSize:10,fontWeight:700,letterSpacing:0.6,textTransform:"uppercase",color:"#fff",fontFamily:"'DM Sans',sans-serif"}}>
                  {m}
                </div>
              </div>
            ))}
          </div>

          {/* Sub-header */}
          <div style={{display:"flex",position:"sticky",top:28,zIndex:10}}>
            <div style={{width:labelW,minWidth:labelW,background:"#222236",borderRight:"1px solid #2a2a3e",height:24}} />
            {MONTHS.map(m => (
              <div key={m} style={{width:colW*2,minWidth:colW*2,display:"flex",borderRight:"1px solid #2a2a3e"}}>
                <div style={{flex:1,background:"#c0392b",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:700,color:"#fff",letterSpacing:0.5}}>Previsto</span>
                </div>
                <div style={{flex:1,background:"#222236",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,fontWeight:700,color:"#bbb",letterSpacing:0.5}}>Realizado</span>
                </div>
              </div>
            ))}
          </div>

          {/* Data rows */}
          {sections.map(sec => (
            <div key={sec.id}>
              <div style={{display:"flex",background:sec.color}}>
                <div style={{width:labelW,minWidth:labelW,padding:"7px 12px",display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:10,fontWeight:800,color:"#fff",letterSpacing:1.5}}>{sec.label}</span>
                </div>
                {MONTHS.map(m => <div key={m} style={{width:colW*2,minWidth:colW*2}} />)}
              </div>

              {sec.rows.map((row, ri) => {
                const stripe = ri % 2 === 0 ? "#fafafa" : "#fff";
                return (
                  <div key={row.key} style={{display:"flex",borderBottom:"1px solid #f0f0f0"}}>
                    <div style={{
                      width:labelW,minWidth:labelW,padding:"0 12px",
                      display:"flex",alignItems:"center",height:32,
                      background:stripe,borderRight:"1px solid #eee",
                      fontSize:11,fontWeight:row.calc?500:700,color:row.calc?"#666":"#222",
                      fontStyle:row.calc?"italic":"normal",
                      fontFamily:"'DM Sans',sans-serif",
                    }}>
                      {row.calc && <span style={{color:"#aaa",marginRight:4,fontSize:9,fontStyle:"normal"}}>ƒ</span>}
                      {row.label}
                    </div>
                    {MONTHS.map(m => {
                      const pVal = row.calc && row.val ? row.val(m, "p") : row.field ? g(row.field, m, "p") : "";
                      const rVal = row.calc && row.val ? row.val(m, "r") : row.field ? g(row.field, m, "r") : "";
                      let rHighlight: "green" | "red" | null = null;
                      if (row.key === "roas" && rVal !== "" && pVal !== "") {
                        rHighlight = Number(rVal) >= Number(pVal) ? "green" : "red";
                      }
                      // "Realizado" is NOT editable when data comes from API
                      const realizadoEditable = !row.calc && !hasData;
                      return (
                        <div key={m} style={{width:colW*2,minWidth:colW*2,display:"flex",borderRight:"1px solid #f0f0f0"}}>
                          <div style={{width:colW,height:32,background:stripe,borderRight:"1px solid #f5f5f5"}}>
                            <EditableCell
                              value={pVal}
                              fmt={row.fmt}
                              editable={!row.calc}
                              isCalc={!!row.calc}
                              onChange={v => row.field && upd(row.field, m, "p", v)}
                            />
                          </div>
                          <div style={{width:colW,height:32,background:stripe}}>
                            <EditableCell
                              value={rVal}
                              fmt={row.fmt}
                              editable={realizadoEditable}
                              isCalc={!!row.calc}
                              highlight={rHighlight}
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
      <div style={{maxWidth:1200,margin:"10px auto 0",display:"flex",gap:20,flexWrap:"wrap",padding:"0 4px"}}>
        <span style={{fontSize:10,color:"#556"}}>
          <span style={{color:"#1a3fb5",fontWeight:700}}>Azul</span> = editável (clique para digitar)
        </span>
        <span style={{fontSize:10,color:"#556"}}>
          <span style={{fontStyle:"italic"}}>ƒ</span> = calculado automaticamente
        </span>
        <span style={{fontSize:10,color:"#556"}}>
          <span style={{color:"#c0392b",fontWeight:700}}>Previsto</span> = sua meta · <span style={{fontWeight:600}}>Realizado</span> = dado real via API
        </span>
      </div>
    </div>
  );
}
