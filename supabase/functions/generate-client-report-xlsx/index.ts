import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import XLSX from "https://esm.sh/xlsx-js-style@1.2.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Style definitions
const styles = {
  titleBar: {
    fill: { fgColor: { rgb: "1B2A4A" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14, name: "Arial" },
    alignment: { horizontal: "center", vertical: "center" },
  },
  subtitleBar: {
    fill: { fgColor: { rgb: "1B2A4A" } },
    font: { color: { rgb: "B0B8C8" }, sz: 10, name: "Arial" },
    alignment: { horizontal: "center", vertical: "center" },
  },
  platformHeader: {
    fill: { fgColor: { rgb: "2563EB" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Arial" },
    alignment: { horizontal: "left", vertical: "center" },
  },
  columnHeader: {
    fill: { fgColor: { rgb: "374151" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10, name: "Arial" },
    alignment: { horizontal: "center", vertical: "center" },
    border: thinBorder("9CA3AF"),
  },
  dataCell: {
    font: { sz: 10, name: "Arial", color: { rgb: "1F2937" } },
    border: thinBorder("E5E7EB"),
    alignment: { vertical: "center" },
  },
  dataCellNumber: {
    font: { sz: 10, name: "Arial", color: { rgb: "1F2937" } },
    border: thinBorder("E5E7EB"),
    alignment: { horizontal: "right", vertical: "center" },
  },
  totalRow: {
    fill: { fgColor: { rgb: "FDE68A" } },
    font: { bold: true, sz: 10, name: "Arial", color: { rgb: "1F2937" } },
    border: thinBorder("D97706"),
    alignment: { horizontal: "right", vertical: "center" },
  },
  totalRowLabel: {
    fill: { fgColor: { rgb: "FDE68A" } },
    font: { bold: true, sz: 10, name: "Arial", color: { rgb: "1F2937" } },
    border: thinBorder("D97706"),
    alignment: { horizontal: "left", vertical: "center" },
  },
  summaryHeader: {
    fill: { fgColor: { rgb: "F97316" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Arial" },
    alignment: { horizontal: "left", vertical: "center" },
  },
  summaryColumnHeader: {
    fill: { fgColor: { rgb: "374151" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 10, name: "Arial" },
    alignment: { horizontal: "center", vertical: "center" },
    border: thinBorder("9CA3AF"),
  },
  summaryData: {
    font: { sz: 10, name: "Arial", color: { rgb: "1F2937" } },
    border: thinBorder("E5E7EB"),
    alignment: { horizontal: "right", vertical: "center" },
  },
  summaryDataLabel: {
    font: { sz: 10, name: "Arial", color: { rgb: "1F2937" } },
    border: thinBorder("E5E7EB"),
    alignment: { horizontal: "left", vertical: "center" },
  },
  grandTotal: {
    fill: { fgColor: { rgb: "F59E0B" } },
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12, name: "Arial" },
    alignment: { horizontal: "center", vertical: "center" },
  },
};

function thinBorder(rgb: string) {
  const side = { style: "thin", color: { rgb } };
  return { top: side, bottom: side, left: side, right: side };
}

function applyStyleToRow(ws: any, rowIdx: number, cols: number, style: any) {
  for (let c = 0; c < cols; c++) {
    const ref = XLSX.utils.encode_cell({ r: rowIdx, c });
    if (!ws[ref]) ws[ref] = { v: "", t: "s" };
    ws[ref].s = style;
  }
}

function applyMerge(merges: any[], r: number, cols: number) {
  merges.push({ s: { r, c: 0 }, e: { r, c: cols - 1 } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const { client_id, month, date, save_to_storage, preview } = await req.json();
    if (!client_id) return new Response(JSON.stringify({ error: "client_id required" }), { status: 400, headers: corsHeaders });

    // Determine period
    let startDate: string, endDate: string, periodLabel: string;
    if (date) {
      startDate = date;
      endDate = date;
      const d = new Date(date + "T00:00:00");
      periodLabel = d.toLocaleDateString("pt-BR");
    } else {
      const m = month || new Date().toISOString().slice(0, 7);
      const [y, mo] = m.split("-").map(Number);
      startDate = `${m}-01`;
      const lastDay = new Date(y, mo, 0).getDate();
      endDate = `${m}-${String(lastDay).padStart(2, "0")}`;
      const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
      periodLabel = `${months[mo - 1]} ${y}`;
    }

    const { data: linkData } = await sb.from("client_manager_links").select("client_label").eq("client_user_id", client_id).limit(1).single();
    const clientName = linkData?.client_label || "Cliente";

    const { data: campaignRows, error: campErr } = await sb
      .from("daily_campaigns").select("*")
      .eq("client_id", client_id).gte("date", startDate).lte("date", endDate);
    if (campErr) throw campErr;

    const activeRows = (campaignRows || []).filter((r: any) => {
      const s = (r.campaign_status || "").toLowerCase();
      return !s.includes("paus") && s !== "paused";
    });

    const { data: metricRows } = await sb
      .from("daily_metrics").select("platform, impressions, spend, clicks")
      .eq("client_id", client_id).gte("date", startDate).lte("date", endDate);

    // Aggregate
    type CampAgg = { name: string; spend: number; clicks: number };
    const platformMap = new Map<string, Map<string, CampAgg>>();
    for (const row of activeRows) {
      const platform = normalizePlatform(row.platform);
      if (!platformMap.has(platform)) platformMap.set(platform, new Map());
      const campMap = platformMap.get(platform)!;
      const existing = campMap.get(row.campaign_name);
      if (existing) {
        existing.spend += Number(row.spend) || 0;
        existing.clicks += Number(row.clicks) || 0;
      } else {
        campMap.set(row.campaign_name, { name: row.campaign_name, spend: Number(row.spend) || 0, clicks: Number(row.clicks) || 0 });
      }
    }

    const platformImpressions = new Map<string, number>();
    for (const m of (metricRows || [])) {
      const p = normalizePlatform(m.platform);
      platformImpressions.set(p, (platformImpressions.get(p) || 0) + (Number(m.impressions) || 0));
    }

    const COLS = 8;
    const rows: any[][] = [];
    const rowStyles: { row: number; style: string }[] = [];
    const merges: any[] = [];

    // Title
    rows.push([`RELATÓRIO DE CUSTOS — ${clientName.toUpperCase()}`]);
    rowStyles.push({ row: 0, style: "title" });
    applyMerge(merges, 0, COLS);

    rows.push([`Período: ${formatBrDate(startDate)} a ${formatBrDate(endDate)}`]);
    rowStyles.push({ row: 1, style: "subtitle" });
    applyMerge(merges, 1, COLS);

    rows.push(["", "", "", "", "", "", "", ""]);

    const summaryData: { platform: string; spend: number; impressions: number; clicks: number }[] = [];
    const platformOrder = ["META ADS", "GOOGLE ADS"];
    for (const p of platformMap.keys()) {
      if (!platformOrder.includes(p)) platformOrder.push(p);
    }

    for (const platform of platformOrder) {
      const campMap = platformMap.get(platform);
      if (!campMap || campMap.size === 0) continue;

      const platformImp = platformImpressions.get(platform) || 0;
      const totalPlatformSpend = Array.from(campMap.values()).reduce((s, c) => s + c.spend, 0);

      // Platform header
      const phRow = rows.length;
      rows.push([`${platform} — ${periodLabel}`]);
      rowStyles.push({ row: phRow, style: "platformHeader" });
      applyMerge(merges, phRow, COLS);

      // Column headers
      const chRow = rows.length;
      rows.push(["Campanha", "Custo (R$)", "Impressões", "Cliques", "CPC (R$)", "CTR (%)", "Alcance", "CPM (R$)"]);
      rowStyles.push({ row: chRow, style: "columnHeader" });

      let totalSpend = 0, totalImp = 0, totalClicks = 0;
      for (const camp of campMap.values()) {
        const campImp = totalPlatformSpend > 0 ? Math.round((camp.spend / totalPlatformSpend) * platformImp) : 0;
        const cpc = camp.clicks > 0 ? round2(camp.spend / camp.clicks) : 0;
        const ctr = campImp > 0 ? round2((camp.clicks / campImp) * 100) : 0;
        const cpm = campImp > 0 ? round2((camp.spend / campImp) * 1000) : 0;

        const dRow = rows.length;
        rows.push([camp.name, round2(camp.spend), campImp, camp.clicks, cpc, ctr, campImp, cpm]);
        rowStyles.push({ row: dRow, style: "data" });

        totalSpend += camp.spend;
        totalImp += campImp;
        totalClicks += camp.clicks;
      }

      const totCpc = totalClicks > 0 ? round2(totalSpend / totalClicks) : 0;
      const totCtr = totalImp > 0 ? round2((totalClicks / totalImp) * 100) : 0;
      const totCpm = totalImp > 0 ? round2((totalSpend / totalImp) * 1000) : 0;

      const tRow = rows.length;
      rows.push([`TOTAL ${platform}`, round2(totalSpend), totalImp, totalClicks, totCpc, totCtr, totalImp, totCpm]);
      rowStyles.push({ row: tRow, style: "total" });

      rows.push(["", "", "", "", "", "", "", ""]);
      summaryData.push({ platform, spend: totalSpend, impressions: totalImp, clicks: totalClicks });
    }

    // RESUMO GERAL
    const sgRow = rows.length;
    rows.push([`RESUMO GERAL — ${periodLabel}`]);
    rowStyles.push({ row: sgRow, style: "summaryHeader" });
    applyMerge(merges, sgRow, COLS);

    const schRow = rows.length;
    rows.push(["Plataforma", "Custo Total", "Moeda", "Impressões", "Cliques", "", "", ""]);
    rowStyles.push({ row: schRow, style: "summaryColumnHeader" });

    let grandTotal = 0;
    for (const sr of summaryData) {
      const sdRow = rows.length;
      rows.push([sr.platform, round2(sr.spend), "BRL", sr.impressions, sr.clicks, "", "", ""]);
      rowStyles.push({ row: sdRow, style: "summaryData" });
      grandTotal += sr.spend;
    }

    rows.push(["", "", "", "", "", "", "", ""]);

    const gtRow = rows.length;
    rows.push([`INVESTIMENTO TOTAL: R$ ${grandTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
    rowStyles.push({ row: gtRow, style: "grandTotal" });
    applyMerge(merges, gtRow, COLS);

    // Build workbook
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws["!cols"] = [
      { wch: 42 }, { wch: 16 }, { wch: 16 }, { wch: 12 },
      { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 12 },
    ];
    ws["!merges"] = merges;

    // Apply row heights
    ws["!rows"] = rows.map((_, i) => {
      const rs = rowStyles.find(r => r.row === i);
      if (rs?.style === "title") return { hpt: 30 };
      if (rs?.style === "platformHeader" || rs?.style === "summaryHeader" || rs?.style === "grandTotal") return { hpt: 26 };
      return { hpt: 20 };
    });

    // Apply styles
    for (const rs of rowStyles) {
      switch (rs.style) {
        case "title":
          applyStyleToRow(ws, rs.row, COLS, styles.titleBar);
          break;
        case "subtitle":
          applyStyleToRow(ws, rs.row, COLS, styles.subtitleBar);
          break;
        case "platformHeader":
          applyStyleToRow(ws, rs.row, COLS, styles.platformHeader);
          break;
        case "columnHeader":
          applyStyleToRow(ws, rs.row, COLS, styles.columnHeader);
          break;
        case "data":
          for (let c = 0; c < COLS; c++) {
            const ref = XLSX.utils.encode_cell({ r: rs.row, c });
            if (!ws[ref]) ws[ref] = { v: "", t: "s" };
            ws[ref].s = c === 0 ? styles.dataCell : styles.dataCellNumber;
          }
          break;
        case "total":
          for (let c = 0; c < COLS; c++) {
            const ref = XLSX.utils.encode_cell({ r: rs.row, c });
            if (!ws[ref]) ws[ref] = { v: "", t: "s" };
            ws[ref].s = c === 0 ? styles.totalRowLabel : styles.totalRow;
          }
          break;
        case "summaryHeader":
          applyStyleToRow(ws, rs.row, COLS, styles.summaryHeader);
          break;
        case "summaryColumnHeader":
          applyStyleToRow(ws, rs.row, COLS, styles.summaryColumnHeader);
          break;
        case "summaryData":
          for (let c = 0; c < COLS; c++) {
            const ref = XLSX.utils.encode_cell({ r: rs.row, c });
            if (!ws[ref]) ws[ref] = { v: "", t: "s" };
            ws[ref].s = c === 0 ? styles.summaryDataLabel : styles.summaryData;
          }
          break;
        case "grandTotal":
          applyStyleToRow(ws, rs.row, COLS, styles.grandTotal);
          break;
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório de Custos");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const uint8 = new Uint8Array(buffer);

    if (save_to_storage) {
      const m = month || new Date().toISOString().slice(0, 7);
      const path = `${client_id}/${m}.xlsx`;
      await sb.storage.from("client-reports").upload(path, uint8, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
    }

    return new Response(uint8, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="relatorio_${clientName.replace(/\s+/g, "_")}_${startDate}_${endDate}.xlsx"`,
      },
    });
  } catch (err: any) {
    console.error("Error generating report:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function normalizePlatform(p: string): string {
  const lower = (p || "").toLowerCase();
  if (lower.includes("meta") || lower.includes("facebook") || lower.includes("instagram")) return "META ADS";
  if (lower.includes("google")) return "GOOGLE ADS";
  return p.toUpperCase();
}

function formatBrDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
