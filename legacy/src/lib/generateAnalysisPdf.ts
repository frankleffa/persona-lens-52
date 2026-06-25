import type { AnalysisReport, FunnelStageAction } from "@/hooks/useDeepAnalysis";

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function generateAnalysisPdf(report: AnalysisReport, clientLabel?: string) {
  const alertas = report.alertas_criticos || [];
  const oportunidades = report.oportunidades || [];
  const otimizacoes = report.otimizacoes || [];
  const anomalias = report.anomalias || [];
  const decadencia = report.campanhas_decadencia || [];
  const planoAcao: FunnelStageAction[] = (report as any).plano_acao || [];

  const scoreColor = report.score > 7 ? "#22c55e" : report.score >= 5 ? "#eab308" : "#ef4444";
  const trendLabel = report.tendencia_7d === "melhorando" ? "↑ Melhorando" : report.tendencia_7d === "piorando" ? "↓ Piorando" : "→ Estável";
  const trendColor = report.tendencia_7d === "melhorando" ? "#22c55e" : report.tendencia_7d === "piorando" ? "#ef4444" : "#888";

  const priorityColor: Record<string, string> = { alta: "#ef4444", media: "#eab308", baixa: "#888" };

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Análise IA — ${escapeHtml(clientLabel || "Cliente")}</title>
<style>
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #1a1a2e; line-height: 1.5; background: #fff; }
  .page-break { page-break-before: always; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a1a2e; padding-bottom: 12px; margin-bottom: 20px; }
  .header h1 { font-size: 20px; font-weight: 800; color: #1a1a2e; }
  .header .meta { text-align: right; font-size: 10px; color: #666; }
  .score-box { display: inline-flex; align-items: center; gap: 12px; background: ${scoreColor}15; border: 1px solid ${scoreColor}40; border-radius: 8px; padding: 10px 16px; margin-bottom: 16px; }
  .score-number { font-size: 32px; font-weight: 900; color: ${scoreColor}; }
  .score-label { font-size: 11px; color: #666; }
  .trend { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; color: ${trendColor}; background: ${trendColor}15; }
  .resumo { background: #f8f9fa; border-left: 3px solid #6366f1; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; font-size: 12px; line-height: 1.6; }
  h2 { font-size: 14px; font-weight: 700; margin: 24px 0 10px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; color: #1a1a2e; }
  h2 .count { color: #888; font-weight: 400; font-size: 11px; }
  .card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 8px; }
  .card-title { font-weight: 700; font-size: 12px; margin-bottom: 4px; }
  .card-desc { color: #555; margin-bottom: 4px; }
  .card-action { color: #6366f1; font-weight: 600; }
  .card-meta { font-size: 10px; color: #888; margin-top: 4px; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .priority-alta { background: #ef444420; color: #ef4444; }
  .priority-media { background: #eab30820; color: #b45309; }
  .priority-baixa { background: #88888820; color: #666; }
  .status-critico { background: #ef444420; color: #ef4444; }
  .status-atencao { background: #eab30820; color: #b45309; }
  .status-saudavel { background: #22c55e20; color: #16a34a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
  th, td { border: 1px solid #e5e7eb; padding: 6px 10px; text-align: left; font-size: 11px; }
  th { background: #f8f9fa; font-weight: 700; }
  .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 9px; color: #999; }
  .dados-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 16px; }
  .dado-item { background: #f8f9fa; border-radius: 4px; padding: 8px 12px; }
  .dado-label { font-size: 9px; color: #888; text-transform: uppercase; font-weight: 600; }
  .dado-value { font-size: 14px; font-weight: 700; color: #1a1a2e; }
</style>
</head>
<body>

<div class="header">
  <h1>📊 Análise de IA</h1>
  <div class="meta">
    <div><strong>${escapeHtml(clientLabel || "Cliente")}</strong></div>
    <div>${formatDate(report.created_at)}</div>
    ${report.vertical_usado ? `<div>Vertical: ${escapeHtml(report.vertical_usado)}</div>` : ""}
    ${report.metrica_primaria_usada ? `<div>Métrica: ${escapeHtml(report.metrica_primaria_usada)}</div>` : ""}
    ${report.modelo_ia ? `<div>Modelo: ${escapeHtml(report.modelo_ia)}</div>` : ""}
  </div>
</div>

<div class="score-box">
  <span class="score-number">${report.score}/10</span>
  <div>
    <div class="score-label">Score de performance</div>
    <span class="trend">${trendLabel}</span>
  </div>
</div>

<div class="resumo">${escapeHtml(report.resumo || "")}</div>

${report.dados_periodo ? `
<h2>📈 Dados do Período</h2>
<div class="dados-grid">
  ${Object.entries(report.dados_periodo).map(([k, v]) => `
    <div class="dado-item">
      <div class="dado-label">${escapeHtml(k.replace(/_/g, " "))}</div>
      <div class="dado-value">${typeof v === "number" ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : escapeHtml(String(v ?? "—"))}</div>
    </div>
  `).join("")}
</div>
` : ""}

${alertas.length > 0 ? `
<h2>🚨 Alertas Críticos <span class="count">(${alertas.length})</span></h2>
${alertas.map(a => `
<div class="card" style="border-left: 3px solid #ef4444;">
  <div class="card-title">${escapeHtml(a.titulo)}</div>
  <div class="card-desc">${escapeHtml(a.descricao)}</div>
  <div class="card-action">Ação: ${escapeHtml(a.acao)}</div>
  <div class="card-meta">
    ${a.campanha ? `Campanha: ${escapeHtml(a.campanha)}` : ""}
    ${a.impacto_estimado ? ` · Impacto: ${escapeHtml(a.impacto_estimado)}` : ""}
  </div>
</div>
`).join("")}` : ""}

${oportunidades.length > 0 ? `
<h2>💡 Oportunidades <span class="count">(${oportunidades.length})</span></h2>
${oportunidades.map(o => `
<div class="card" style="border-left: 3px solid #22c55e;">
  <div class="card-title">${escapeHtml(o.titulo)}</div>
  <div class="card-desc">${escapeHtml(o.descricao)}</div>
  <div class="card-action">Ação: ${escapeHtml(o.acao)}</div>
  <div class="card-meta">
    ${o.campanha ? `Campanha: ${escapeHtml(o.campanha)}` : ""}
    ${o.potencial ? ` · Potencial: ${escapeHtml(o.potencial)}` : ""}
  </div>
</div>
`).join("")}` : ""}

${otimizacoes.length > 0 ? `
<h2>🔧 Otimizações <span class="count">(${otimizacoes.length})</span></h2>
${[...otimizacoes].sort((a, b) => {
  const ord: Record<string, number> = { alta: 0, media: 1, baixa: 2 };
  return (ord[a.prioridade] ?? 2) - (ord[b.prioridade] ?? 2);
}).map(o => `
<div class="card">
  <div class="card-title">
    <span class="badge priority-${o.prioridade}">${o.prioridade}</span>
    ${escapeHtml(o.titulo)}
  </div>
  <div class="card-desc">${escapeHtml(o.descricao)}</div>
  <div class="card-action">Ação: ${escapeHtml(o.acao)}</div>
  ${o.campanha ? `<div class="card-meta">Campanha: ${escapeHtml(o.campanha)}</div>` : ""}
</div>
`).join("")}` : ""}

${planoAcao.length > 0 ? `
<div class="page-break"></div>
<h2>🎯 Plano de Ação por Etapa do Funil <span class="count">(${planoAcao.length})</span></h2>
<table>
  <thead><tr><th>Etapa</th><th>Status</th><th>Taxa Atual</th><th>Benchmark</th><th>Diagnóstico</th><th>Ações</th></tr></thead>
  <tbody>
    ${planoAcao.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.etapa)}</strong></td>
      <td><span class="badge status-${p.status}">${p.status}</span></td>
      <td>${escapeHtml(p.taxa_atual)}</td>
      <td>${escapeHtml(p.benchmark)}</td>
      <td>${escapeHtml(p.diagnostico)}</td>
      <td>${(p.acoes || []).map(a => `• ${escapeHtml(a)}`).join("<br/>")}</td>
    </tr>
    `).join("")}
  </tbody>
</table>
` : ""}

${anomalias.length > 0 ? `
<h2>⚠️ Anomalias Detectadas <span class="count">(${anomalias.length})</span></h2>
${anomalias.map(a => `
<div class="card" style="border-left: 3px solid #eab308;">
  <div class="card-title">${escapeHtml(a.type || "Anomalia")}</div>
  <div class="card-desc">${escapeHtml(a.description)}</div>
</div>
`).join("")}` : ""}

${decadencia.length > 0 ? `
<h2>📉 Campanhas em Decadência <span class="count">(${decadencia.length})</span></h2>
${decadencia.map(c => `
<div class="card" style="border-left: 3px solid #f97316;">
  <div class="card-title">${escapeHtml(c.campaign_name)}</div>
  <div class="card-desc">${escapeHtml(c.description)}</div>
</div>
`).join("")}` : ""}

${report.previsao ? `
<h2>🔮 Previsão</h2>
<div class="resumo">${escapeHtml(report.previsao)}</div>
` : ""}

<div class="footer">
  Relatório gerado automaticamente por IA · ${formatDate(report.created_at)}
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  if (printWindow) {
    printWindow.addEventListener("load", () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
      }, 300);
    });
  } else {
    // Fallback: download as HTML
    const a = document.createElement("a");
    a.href = url;
    a.download = `analise-ia-${clientLabel || "cliente"}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
