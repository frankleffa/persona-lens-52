import { useState, useRef, useEffect, useCallback } from "react";

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

interface MonthData {
  p: string;
  r: string;
}

type MonthMap = Record<string, MonthData>;

interface SpreadsheetData {
  investimento: MonthMap;
  receita: MonthMap;
  taxaConv: MonthMap;
  transacoes: MonthMap;
  sessoesGeral: MonthMap;
  sessoesMidia: MonthMap;
  fbInvest: MonthMap;
  fbSessoes: MonthMap;
  googleInvest: MonthMap;
  googleSessoes: MonthMap;
}

const initM = (): MonthMap => MONTHS.reduce((a,m)=>({...a,[m]:{p:"",r:""}}),{} as MonthMap);

const defaultData = (): SpreadsheetData => ({
  investimento:initM(), receita:initM(), taxaConv:initM(), transacoes:initM(),
  sessoesGeral:initM(), sessoesMidia:initM(),
  fbInvest:initM(), fbSessoes:initM(),
  googleInvest:initM(), googleSessoes:initM(),
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

// ── Meta Sync Modal ────────────────────────────────────────────

interface MetaSyncModalProps {
  open: boolean;
  onClose: () => void;
  onSync: (data: Record<string, { spend: string; sessions: number }>) => void;
}

const MetaSyncModal = ({ open, onClose, onSync }: MetaSyncModalProps) => {
  const [token, setToken] = useState("");
  const [adAccount, setAdAccount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"success" | "error" | null>(null);

  if (!open) return null;

  const handleSync = async () => {
    setLoading(true);
    setStatus(null);
    try {
      // Simulate API call — in production this calls the Meta Marketing API
      await new Promise(r => setTimeout(r, 1500));
      const mockData: Record<string, { spend: string; sessions: number }> = {};
      MONTHS.forEach((m, i) => {
        if (i <= 2) {
          mockData[m] = {
            spend: (12000 + Math.random() * 8000).toFixed(2),
            sessions: Math.floor(3000 + Math.random() * 4000),
          };
        }
      });
      onSync(mockData);
      setStatus("success");
      setTimeout(() => { onClose(); setStatus(null); }, 1000);
    } catch {
      setStatus("error");
    }
    setLoading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(4px)"}}>
      <div style={{background:"#fff",borderRadius:14,padding:28,width:420,maxWidth:"90vw",boxShadow:"0 24px 80px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
          <div style={{width:36,height:36,borderRadius:10,background:"#1877F2",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          </div>
          <div>
            <div style={{fontWeight:700,fontSize:16,color:"#1a1a2e",fontFamily:"'DM Sans',sans-serif"}}>Conectar Meta Ads</div>
            <div style={{fontSize:12,color:"#888"}}>Importar dados de investimento e sessões</div>
          </div>
        </div>

        <label style={{display:"block",marginBottom:14}}>
          <span style={{fontSize:11,fontWeight:600,color:"#555",textTransform:"uppercase",letterSpacing:0.8}}>Access Token</span>
          <input
            value={token}
            onChange={e => setToken(e.target.value)}
            placeholder="Cole seu token aqui..."
            style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,marginTop:4,fontFamily:"'IBM Plex Mono',monospace",boxSizing:"border-box",outline:"none"}}
          />
        </label>

        <label style={{display:"block",marginBottom:20}}>
          <span style={{fontSize:11,fontWeight:600,color:"#555",textTransform:"uppercase",letterSpacing:0.8}}>Ad Account ID</span>
          <input
            value={adAccount}
            onChange={e => setAdAccount(e.target.value)}
            placeholder="Ex: 123456789"
            style={{width:"100%",padding:"10px 12px",border:"1.5px solid #e0e0e0",borderRadius:8,fontSize:13,marginTop:4,fontFamily:"'IBM Plex Mono',monospace",boxSizing:"border-box",outline:"none"}}
          />
        </label>

        <div style={{padding:"12px 14px",background:"#f0f4ff",borderRadius:8,marginBottom:20,fontSize:11,color:"#555",lineHeight:1.6}}>
          <strong style={{color:"#1a3fb5"}}>Como obter o token:</strong><br/>
          Meta Business Suite → Configurações → Informações da empresa → Token de acesso da API de Marketing
        </div>

        {status === "success" && (
          <div style={{padding:"10px",background:"#e8f5e9",borderRadius:8,marginBottom:12,fontSize:12,color:"#2e7d32",fontWeight:600,textAlign:"center"}}>
            Dados importados com sucesso!
          </div>
        )}
        {status === "error" && (
          <div style={{padding:"10px",background:"#ffebee",borderRadius:8,marginBottom:12,fontSize:12,color:"#c62828",fontWeight:600,textAlign:"center"}}>
            Erro ao conectar. Verifique o token.
          </div>
        )}

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:"10px",border:"1.5px solid #ddd",borderRadius:8,background:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",color:"#666"}}>
            Cancelar
          </button>
          <button
            onClick={handleSync}
            disabled={loading || !token || !adAccount}
            style={{flex:1,padding:"10px",border:"none",borderRadius:8,background:loading?"#90caf9":"#1877F2",fontSize:13,fontWeight:700,cursor:"pointer",color:"#fff",opacity:(!token||!adAccount)?0.5:1}}
          >
            {loading ? "Importando..." : "Sincronizar"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Section / Row types ────────────────────────────────────────

interface RowDef {
  key: string;
  label: string;
  field?: keyof SpreadsheetData;
  calc?: boolean;
  fmt: Formatter;
  val?: (m: string, t: "p" | "r") => string | number;
}

interface SectionDef {
  id: string;
  label: string;
  color: string;
  rows: RowDef[];
}

// ── Main Page ──────────────────────────────────────────────────

export default function ResultsMeasurement() {
  const [data, setData] = useState<SpreadsheetData>(defaultData);
  const [clientName, setClientName] = useState("NOME DO CLIENTE");
  const [editingName, setEditingName] = useState(false);
  const [metaModal, setMetaModal] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const upd = useCallback((field: keyof SpreadsheetData, month: string, tipo: "p" | "r", val: string) => {
    setData(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        [month]: { ...prev[field][month], [tipo]: val },
      },
    }));
  }, []);

  const handleMetaSync = (metaData: Record<string, { spend: string; sessions: number }>) => {
    setData(prev => {
      const next = { ...prev };
      const fbI = { ...prev.fbInvest };
      const fbS = { ...prev.fbSessoes };
      Object.entries(metaData).forEach(([m, d]) => {
        fbI[m] = { ...fbI[m], r: d.spend };
        fbS[m] = { ...fbS[m], r: String(d.sessions) };
      });
      next.fbInvest = fbI;
      next.fbSessoes = fbS;
      return next;
    });
    setLastSync(new Date().toLocaleTimeString("pt-BR"));
  };

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

  return (
    <div className="page-container" style={{ minHeight:"100vh", background:"#0e1117", padding:"16px 12px", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      <MetaSyncModal open={metaModal} onClose={() => setMetaModal(false)} onSync={handleMetaSync} />

      {/* Top bar */}
      <div style={{maxWidth:1200,margin:"0 auto 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:6,height:32,borderRadius:3,background:"linear-gradient(180deg,#c0392b,#e74c3c)"}} />
          <div>
            <div style={{fontSize:10,color:"#556",fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",marginBottom:2}}>
              Planilha de Acompanhamento
            </div>
            {editingName ? (
              <input
                autoFocus
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={e => { if (e.key === "Enter") setEditingName(false); }}
                style={{
                  background:"transparent",border:"none",borderBottom:"2px solid #c0392b",outline:"none",
                  color:"#f0f0f0",fontSize:20,fontWeight:800,padding:"2px 0",fontFamily:"'DM Sans',sans-serif",
                }}
              />
            ) : (
              <div
                onClick={() => setEditingName(true)}
                style={{color:"#f0f0f0",fontSize:20,fontWeight:800,cursor:"pointer",borderBottom:"2px dashed rgba(255,255,255,0.15)",paddingBottom:2}}
              >
                {clientName}
              </div>
            )}
          </div>
        </div>

        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {lastSync && <span style={{fontSize:10,color:"#556",marginRight:4}}>Sync: {lastSync}</span>}
          <button
            onClick={() => setMetaModal(true)}
            style={{
              display:"flex",alignItems:"center",gap:7,padding:"9px 16px",border:"none",borderRadius:8,
              background:"#1877F2",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",
              boxShadow:"0 2px 12px rgba(24,119,242,0.3)",fontFamily:"'DM Sans',sans-serif",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Sync Meta Ads
          </button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div ref={scrollRef} style={{
        maxWidth:1200,margin:"0 auto",overflowX:"auto",borderRadius:10,
        border:"1px solid #252530",background:"#fff",
        boxShadow:"0 8px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{minWidth:totalW}}>
          {/* Month headers row */}
          <div style={{display:"flex",position:"sticky",top:0,zIndex:10}}>
            <div style={{width:labelW,minWidth:labelW,background:"#1a1a2e",borderRight:"1px solid #2a2a3e",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:10,fontWeight:700,color:"#888",letterSpacing:1}}>MÉTRICAS</span>
            </div>
            {MONTHS.map(m => (
              <div key={m} style={{width:colW*2,minWidth:colW*2,background:"#1a1a2e",textAlign:"center",borderRight:"1px solid #2a2a3e"}}>
                <div style={{padding:"6px 4px",fontSize:10,fontWeight:700,textAlign:"center",letterSpacing:0.6,textTransform:"uppercase",color:"#fff",fontFamily:"'DM Sans',sans-serif"}}>
                  {m}
                </div>
              </div>
            ))}
          </div>

          {/* Previsto / Realizado sub-header */}
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
              {/* Section header */}
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
                              editable={!row.calc}
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
          <span style={{color:"#c0392b",fontWeight:700}}>Previsto</span> = sua meta · <span style={{fontWeight:600}}>Realizado</span> = dado real ou via API
        </span>
      </div>
    </div>
  );
}
